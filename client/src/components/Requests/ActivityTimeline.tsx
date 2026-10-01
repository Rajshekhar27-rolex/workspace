import { Activity } from '../../types/api';

interface ActivityTimelineProps {
  activities?: Activity[];
}

export function ActivityTimeline({ activities = [] }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
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

  const getActionClass = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'timeline-badge badge-new';
      case 'CONVERTED_TO_WORK_ITEM':
        return 'timeline-badge badge-qualified';
      case 'STATUS_CHANGED':
        return 'timeline-badge badge-status';
      default:
        return 'timeline-badge';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CONVERTED_TO_WORK_ITEM':
        return 'Converted to Work Item';
      case 'STATUS_CHANGED':
        return 'Status Changed';
      case 'CREATED':
        return 'Created';
      case 'UPDATED':
        return 'Updated';
      default:
        return action;
    }
  };

  return (
    <div className="activity-timeline" data-testid="activity-timeline">
      <h3 className="timeline-title">Activity Audit Timeline</h3>
      <ol className="timeline-list">
        {activities.map((act) => (
          <li key={act.id} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <div className="timeline-header">
                <span className={getActionClass(act.action)}>{getActionLabel(act.action)}</span>
                <span className="timeline-author">by {act.user?.name || 'System User'}</span>
                <time className="timeline-date">{formatTimestamp(act.createdAt)}</time>
              </div>
              {act.details && <p className="timeline-details">{act.details}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
