import { CustomerRequest } from '../../types/api';
import { StatusBadge } from '../Common/StatusBadge';
import { ActivityTimeline } from './ActivityTimeline';

interface RequestDetailProps {
  request: CustomerRequest | null;
  onClose: () => void;
  onEdit: (request: CustomerRequest) => void;
  onOpenConvertModal: (request: CustomerRequest) => void;
}

export function RequestDetail({
  request,
  onClose,
  onEdit,
  onOpenConvertModal,
}: RequestDetailProps) {
  if (!request) {
    return (
      <div className="card detail-placeholder" data-testid="detail-placeholder">
        <div className="placeholder-icon">👉</div>
        <h3>Select a request</h3>
        <p className="text-muted">Choose a customer request from the list to view its complete audit timeline and conversion status.</p>
      </div>
    );
  }

  const isQualified = request.status === 'QUALIFIED';
  const hasWorkItem = Boolean(request.workItem);

  const formatScheduledDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="card request-detail-view" data-testid="request-detail-view">
      <div className="detail-header">
        <div>
          <div className="detail-meta">
            <StatusBadge status={request.status} />
            <span className="detail-id">ID: {request.id.slice(0, 8)}...</span>
          </div>
          <h2 className="detail-title" data-testid="detail-customer-name">
            {request.customerName}
          </h2>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={onClose}
          aria-label="Close detail view"
          title="Close details"
        >
          ✕
        </button>
      </div>

      <div className="detail-actions-bar">
        {/* Action button: Create Work Item (human-confirmed) */}
        {isQualified && !hasWorkItem && (
          <button
            type="button"
            className="btn btn-success"
            onClick={() => onOpenConvertModal(request)}
            data-testid="create-work-item-btn"
          >
            🗓 Create Work Item
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onEdit(request)}
          data-testid="edit-request-btn"
        >
          ✏️ Edit Details
        </button>
      </div>

      {/* Work Item Information Banner (if already converted) */}
      {hasWorkItem && request.workItem && (
        <div className="work-item-card" data-testid="scheduled-work-item-banner">
          <div className="work-item-header">
            <span className="work-item-icon">🗓</span>
            <span className="work-item-tag">Scheduled Work Item</span>
          </div>
          <div className="work-item-date" data-testid="scheduled-date-display">
            {formatScheduledDate(request.workItem.scheduledDate)}
          </div>
          {request.workItem.notes && (
            <p className="work-item-notes">Notes: {request.workItem.notes}</p>
          )}
        </div>
      )}

      {/* Customer & Service Info Grid */}
      <div className="detail-info-grid">
        <div className="info-block">
          <span className="info-label">Customer Email</span>
          <span className="info-value" data-testid="detail-email">
            {request.customerEmail}
          </span>
        </div>

        {request.customerPhone && (
          <div className="info-block">
            <span className="info-label">Phone</span>
            <span className="info-value" data-testid="detail-phone">
              {request.customerPhone}
            </span>
          </div>
        )}

        <div className="info-block full-width">
          <span className="info-label">Requested Service</span>
          <span className="info-value service-highlight" data-testid="detail-service">
            {request.requestedService}
          </span>
        </div>

        {request.details && (
          <div className="info-block full-width">
            <span className="info-label">Details & Notes</span>
            <p className="info-details-text" data-testid="detail-notes">
              {request.details}
            </p>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline activities={request.activities} />
    </section>
  );
}
