import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import { CustomerRequest, RequestStatus } from './types/api';
import { Navbar } from './components/Layout/Navbar';
import { ToastContainer, ToastMessage } from './components/Common/Toast';
import { FilterBar } from './components/Requests/FilterBar';
import { RequestList } from './components/Requests/RequestList';
import { RequestDetail } from './components/Requests/RequestDetail';
import { RequestFormModal } from './components/Requests/RequestFormModal';
import { ConvertConfirmModal } from './components/Requests/ConvertConfirmModal';

function DeskDashboard() {
  const { currentUser } = useAuth();

  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [requestToEdit, setRequestToEdit] = useState<CustomerRequest | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState<boolean>(false);
  const [requestToConvert, setRequestToConvert] = useState<CustomerRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load requests when currentUser changes
  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setApiError(null);
      const res = await api.listRequests();
      setRequests(res.requests);

      // Keep selected request updated if it exists
      if (selectedRequest) {
        const refreshed = res.requests.find((r) => r.id === selectedRequest.id);
        if (refreshed) {
          // Fetch full single request to have activities
          try {
            const detailRes = await api.getRequest(refreshed.id);
            setSelectedRequest(detailRes.request);
          } catch {
            setSelectedRequest(refreshed);
          }
        } else {
          setSelectedRequest(null);
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to load customer requests.');
      addToast('error', err.message || 'Failed to load customer requests.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedRequest?.id]);

  useEffect(() => {
    setSelectedRequest(null);
    loadRequests();
  }, [currentUser?.id]);

  // Select a request and fetch its full details (including activities)
  const handleSelectRequest = async (req: CustomerRequest) => {
    try {
      const res = await api.getRequest(req.id);
      setSelectedRequest(res.request);
    } catch {
      setSelectedRequest(req);
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (currentFilter === 'ALL') return requests;
    return requests.filter((r) => r.status === currentFilter);
  }, [requests, currentFilter]);

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts = { ALL: requests.length, NEW: 0, QUALIFIED: 0, CLOSED: 0 };
    for (const r of requests) {
      if (r.status === 'NEW') counts.NEW++;
      else if (r.status === 'QUALIFIED') counts.QUALIFIED++;
      else if (r.status === 'CLOSED') counts.CLOSED++;
    }
    return counts;
  }, [requests]);

  // Open Create Request Modal
  const handleOpenCreateModal = () => {
    setRequestToEdit(null);
    setIsFormOpen(true);
  };

  // Open Edit Request Modal
  const handleOpenEditModal = (req: CustomerRequest) => {
    setRequestToEdit(req);
    setIsFormOpen(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleFormSubmit = async (data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    requestedService: string;
    details?: string | null;
    status?: RequestStatus;
  }) => {
    try {
      setIsSubmitting(true);
      if (requestToEdit) {
        const res = await api.updateRequest(requestToEdit.id, data);
        addToast('success', `Request for ${res.request.customerName} updated successfully.`);
        setSelectedRequest(res.request);
      } else {
        const res = await api.createRequest(data);
        addToast('success', `New request for ${res.request.customerName} created.`);
        setSelectedRequest(res.request);
      }
      setIsFormOpen(false);
      await loadRequests();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Work Item Conversion Modal
  const handleOpenConvertModal = (req: CustomerRequest) => {
    setRequestToConvert(req);
    setIsConvertModalOpen(true);
  };

  // Handle Confirmed Conversion Submit
  const handleConfirmConvert = async (data: { scheduledDate: string; notes?: string }) => {
    if (!requestToConvert) return;
    try {
      setIsSubmitting(true);
      const res = await api.convertToWorkItem(requestToConvert.id, data);
      addToast(
        'success',
        `Work Item scheduled successfully for ${res.request.customerName}!`
      );
      setIsConvertModalOpen(false);
      setSelectedRequest(res.request);
      await loadRequests();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to convert request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar onNewRequest={handleOpenCreateModal} />

      <main className="container">
        {apiError && (
          <div className="error-banner" role="alert" data-testid="api-error-banner">
            <span>{apiError}</span>
            <button className="btn btn-secondary" onClick={loadRequests}>
              Retry
            </button>
          </div>
        )}

        <FilterBar
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          counts={filterCounts}
        />

        <div className="desk-layout">
          <section aria-label="Customer request list">
            <RequestList
              requests={filteredRequests}
              selectedId={selectedRequest?.id || null}
              onSelectRequest={handleSelectRequest}
              loading={loading}
            />
          </section>

          <section aria-label="Customer request details">
            <RequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onEdit={handleOpenEditModal}
              onOpenConvertModal={handleOpenConvertModal}
            />
          </section>
        </div>
      </main>

      {/* Create / Edit Request Modal */}
      <RequestFormModal
        isOpen={isFormOpen}
        requestToEdit={requestToEdit}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Confirmed Work Item Conversion Modal */}
      <ConvertConfirmModal
        isOpen={isConvertModalOpen}
        request={requestToConvert}
        onClose={() => setIsConvertModalOpen(false)}
        onConfirm={handleConfirmConvert}
        isSubmitting={isSubmitting}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <DeskDashboard />
    </AuthProvider>
  );
}

export default App;
