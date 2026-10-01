import { RequestStatus } from '../../types/api';

interface StatusBadgeProps {
  status: RequestStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeClass = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'badge badge-new';
      case 'QUALIFIED':
        return 'badge badge-qualified';
      case 'CLOSED':
        return 'badge badge-closed';
      default:
        return 'badge';
    }
  };

  return (
    <span className={getBadgeClass(status)} data-testid={`status-badge-${status.toLowerCase()}`}>
      {status}
    </span>
  );
}
