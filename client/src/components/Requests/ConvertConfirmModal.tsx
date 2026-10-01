import { useState, useEffect, FormEvent } from 'react';
import { CustomerRequest } from '../../types/api';

interface ConvertConfirmModalProps {
  isOpen: boolean;
  request: CustomerRequest | null;
  onClose: () => void;
  onConfirm: (data: { scheduledDate: string; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function ConvertConfirmModal({
  isOpen,
  request,
  onClose,
  onConfirm,
  isSubmitting,
}: ConvertConfirmModalProps) {
  // Default to tomorrow 09:00 AM
  const getTomorrowDefault = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
  };

  const [scheduledDate, setScheduledDate] = useState<string>(getTomorrowDefault());
  const [notes, setNotes] = useState<string>('');
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScheduledDate(getTomorrowDefault());
      setNotes('');
      setDateError(null);
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setDateError('Please select a scheduled date and time.');
      return;
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      setDateError('Invalid date selected.');
      return;
    }

    setDateError(null);
    await onConfirm({
      scheduledDate: parsedDate.toISOString(),
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            Confirm Work Item Conversion
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">
              Please review the customer details and schedule this qualified request before confirming.
            </p>

            <div className="confirmation-summary-box">
              <div className="summary-field">
                <span className="summary-label">Customer</span>
                <span className="summary-value" data-testid="confirm-customer-name">
                  {request.customerName}
                </span>
                <span className="summary-subtext">{request.customerEmail}</span>
              </div>

              <div className="summary-field">
                <span className="summary-label">Requested Service</span>
                <span className="summary-value" data-testid="confirm-requested-service">
                  {request.requestedService}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="scheduled-date-input" className="form-label">
                Scheduled Date & Time <span className="required">*</span>
              </label>
              <input
                id="scheduled-date-input"
                type="datetime-local"
                className={`form-input ${dateError ? 'input-error' : ''}`}
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  if (dateError) setDateError(null);
                }}
                disabled={isSubmitting}
                data-testid="scheduled-date-picker"
                required
              />
              {dateError && <span className="field-error">{dateError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="work-item-notes" className="form-label">
                Scheduling Notes (Optional)
              </label>
              <textarea
                id="work-item-notes"
                className="form-textarea"
                rows={3}
                placeholder="Assignee, equipment, or bay instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                data-testid="scheduled-notes-input"
              />
            </div>

            <div className="info-callout">
              <span className="callout-icon">ℹ️</span>
              <p className="callout-text">
                Confirming will convert this request and add an entry to the activity audit timeline.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="cancel-convert-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={isSubmitting}
              data-testid="confirm-convert-btn"
            >
              {isSubmitting ? 'Converting...' : 'Confirm & Create Work Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
