import { useState, useEffect } from 'react';

export function App() {
  const [healthStatus, setHealthStatus] = useState<string>('Checking backend connection...');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setHealthStatus(`Connected: ${data.service} (Status: ${data.status})`);
        setIsOnline(true);
      })
      .catch((err) => {
        setHealthStatus(`Backend offline or waiting to start (${err.message})`);
        setIsOnline(false);
      });
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1 className="title" data-testid="app-title">Client Request Desk</h1>
        <p className="subtitle">Multi-Tenant Operations Desk for Local Businesses</p>
      </header>

      <main>
        <section className="card">
          <h2>Milestone 1 Foundation</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            Core infrastructure initialized: React 18, Vite, TypeScript, Express, SQLite, Prisma, Zod, and Vitest.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="status-pill"
              style={{
                backgroundColor:
                  isOnline === true ? 'var(--success-color)' : isOnline === false ? 'var(--danger-color)' : 'var(--warning-color)',
              }}
            />
            <span data-testid="backend-status" style={{ fontSize: '0.875rem' }}>
              {healthStatus}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
