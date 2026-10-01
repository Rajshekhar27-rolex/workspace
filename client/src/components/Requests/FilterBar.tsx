interface FilterBarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    ALL: number;
    NEW: number;
    QUALIFIED: number;
    CLOSED: number;
  };
}

export function FilterBar({ currentFilter, onFilterChange, counts }: FilterBarProps) {
  const filters = [
    { id: 'ALL', label: 'All Requests' },
    { id: 'NEW', label: 'New' },
    { id: 'QUALIFIED', label: 'Qualified' },
    { id: 'CLOSED', label: 'Closed' },
  ] as const;

  return (
    <nav className="filter-bar" aria-label="Request status filters">
      {filters.map((tab) => {
        const count = counts[tab.id] || 0;
        const isActive = currentFilter === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`filter-tab ${isActive ? 'active' : ''}`}
            onClick={() => onFilterChange(tab.id)}
            data-testid={`filter-${tab.id.toLowerCase()}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span>{tab.label}</span>
            <span className="filter-count">{count}</span>
          </button>
        );
      })}
    </nav>
  );
}
