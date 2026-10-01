import { useState, useEffect, FormEvent } from 'react';
import { CustomerRequest, RequestStatus } from '../../types/api';

interface RequestFormModalProps {
  isOpen: boolean;
  requestToEdit?: CustomerRequest | null;
  onClose: () => void;
  onSubmit: (data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    requestedService: string;
    details?: string | null;
    status?: RequestStatus;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function RequestFormModal({
  isOpen,
  requestToEdit,
  onClose,
  onSubmit,
  isSubmitting,
}: RequestFormModalProps) {
  const isEdit = Boolean(requestToEdit);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [requestedService, setRequestedService] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<RequestStatus>('NEW');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (requestToEdit) {
        setCustomerName(requestToEdit.customerName);
        setCustomerEmail(requestToEdit.customerEmail);
        setCustomerPhone(requestToEdit.customerPhone || '');
        setRequestedService(requestToEdit.requestedService);
        setDetails(requestToEdit.details || '');
        setStatus(requestToEdit.status);
      } else {
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setRequestedService('');
        setDetails('');
        setStatus('NEW');
      }
      setErrors({});
    }
  }, [isOpen, requestToEdit]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 2) {
      errs.customerName = 'Customer name must be at least 2 characters.';
    } else if (customerName.trim().length > 100) {
      errs.customerName = 'Customer name must not exceed 100 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim()) {
      errs.customerEmail = 'Customer email is required.';
    } else if (!emailRegex.test(customerEmail.trim())) {
      errs.customerEmail = 'Please provide a valid email address.';
    }

    if (!requestedService.trim() || requestedService.trim().length < 2) {
      errs.requestedService = 'Requested service must be at least 2 characters.';
    } else if (requestedService.trim().length > 150) {
      errs.requestedService = 'Requested service must not exceed 150 characters.';
    }

    if (details.length > 1000) {
      errs.details = 'Details must not exceed 1000 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim() ? customerPhone.trim() : null,
      requestedService: requestedService.trim(),
      details: details.trim() ? details.trim() : null,
      status,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="form-modal-title" className="modal-title">
            {isEdit ? 'Edit Customer Request' : 'Create Customer Request'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="customer-name-input" className="form-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                id="customer-name-input"
                type="text"
                className={`form-input ${errors.customerName ? 'input-error' : ''}`}
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) setErrors({ ...errors, customerName: '' });
                }}
                disabled={isSubmitting}
                data-testid="input-customer-name"
                required
              />
              {errors.customerName && (
                <span className="field-error" data-testid="error-customer-name">
                  {errors.customerName}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customer-email-input" className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  id="customer-email-input"
                  type="email"
                  className={`form-input ${errors.customerEmail ? 'input-error' : ''}`}
                  placeholder="e.g. john@example.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    if (errors.customerEmail) setErrors({ ...errors, customerEmail: '' });
                  }}
                  disabled={isSubmitting}
                  data-testid="input-customer-email"
                  required
                />
                {errors.customerEmail && (
                  <span className="field-error" data-testid="error-customer-email">
                    {errors.customerEmail}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="customer-phone-input" className="form-label">
                  Phone (Optional)
                </label>
                <input
                  id="customer-phone-input"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 555-0199"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="input-customer-phone"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="requested-service-input" className="form-label">
                Requested Service <span className="required">*</span>
              </label>
              <input
                id="requested-service-input"
                type="text"
                className={`form-input ${errors.requestedService ? 'input-error' : ''}`}
                placeholder="e.g. Brake Inspection or Deep Carpet Cleaning"
                value={requestedService}
                onChange={(e) => {
                  setRequestedService(e.target.value);
                  if (errors.requestedService) setErrors({ ...errors, requestedService: '' });
                }}
                disabled={isSubmitting}
                data-testid="input-requested-service"
                required
              />
              {errors.requestedService && (
                <span className="field-error" data-testid="error-requested-service">
                  {errors.requestedService}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="request-details-input" className="form-label">
                Additional Details / Notes
              </label>
              <textarea
                id="request-details-input"
                className={`form-textarea ${errors.details ? 'input-error' : ''}`}
                rows={3}
                placeholder="Customer symptoms, special instructions, or service preferences..."
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  if (errors.details) setErrors({ ...errors, details: '' });
                }}
                disabled={isSubmitting}
                data-testid="input-details"
              />
              {errors.details && <span className="field-error">{errors.details}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="request-status-select" className="form-label">
                Status
              </label>
              <select
                id="request-status-select"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                disabled={isSubmitting}
                data-testid="input-status"
              >
                <option value="NEW">NEW</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="cancel-form-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              data-testid="submit-form-btn"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
