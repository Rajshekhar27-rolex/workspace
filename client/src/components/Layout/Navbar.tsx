import { useAuth } from '../../context/AuthContext';

export function Navbar({ onNewRequest }: { onNewRequest: () => void }) {
  const { currentUser, availableUsers, switchUser, loading } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="navbar-logo">📋</span>
          <div>
            <span className="navbar-title">Client Request Desk</span>
            <div className="navbar-tenant-pill">
              <span className="tenant-dot"></span>
              <span className="tenant-name" data-testid="current-workspace-name">
                {currentUser?.workspaceName || 'Loading workspace...'}
              </span>
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="user-switcher">
            <label htmlFor="user-select" className="switcher-label">
              Active User:
            </label>
            <select
              id="user-select"
              className="switcher-select"
              value={currentUser?.id || ''}
              disabled={loading}
              onChange={(e) => switchUser(e.target.value)}
              data-testid="workspace-user-switcher"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.workspaceName})
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={onNewRequest}
            data-testid="create-request-btn"
          >
            + New Request
          </button>
        </div>
      </div>
    </header>
  );
}
