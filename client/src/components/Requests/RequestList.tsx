import { CustomerRequest } from '../../types/api';
import { StatusBadge } from '../Common/StatusBadge';

interface RequestListProps {
  requests: CustomerRequest[];
  selectedId: string | null;
  onSelectRequest: (request: CustomerRequest) => void;
  loading: boolean;
}

export function RequestList({
  requests,
  selectedId,
  onSelectRequest,
  loading,
}: RequestListProps) {
  if (loading) {
    return (
      <div className="request-list-loading" data-testid="request-list-loading">
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="empty-state card" data-testid="empty-state">
        <div className="empty-icon">📭</div>
        <h3 className="empty-title">No requests found</h3>
        <p className="empty-subtitle">
          There are no customer requests matching the current status filter.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="request-list" data-testid="request-list">
      {requests.map((req) => {
        const isSelected = selectedId === req.id;
        const hasWorkItem = Boolean(req.workItem);

        return (
          <article
            key={req.id}
            tabIndex={0}
            role="button"
            className={`request-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectRequest(req)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRequest(req);
              }
            }}
            data-testid={`request-item-${req.id}`}
          >
            <div className="request-card-header">
              <span className="customer-name">{req.customerName}</span>
              <div className="request-card-badges">
                {hasWorkItem && (
                  <span className="badge badge-work-item" title="Scheduled Work Item Created">
                    🗓 Work Item
                  </span>
                )}
                <StatusBadge status={req.status} />
              </div>
            </div>

            <p className="requested-service">{req.requestedService}</p>

            <div className="request-card-footer">
              <span className="customer-contact">{req.customerEmail}</span>
              <time className="request-date">{formatDate(req.createdAt)}</time>
            </div>
          </article>
        );
      })}
    </div>
  );
}
