import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

describe('App Foundation Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders application title and subtitle', async () => {
    // Mock fetch to avoid unhandled rejection in test
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'client-request-desk-api' }),
      })
    );

    render(<App />);
    expect(screen.getByTestId('app-title')).toHaveTextContent('Client Request Desk');
    expect(screen.getByText('Milestone 1 Foundation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toBeInTheDocument();
    });
  });

  it('displays connected status when health check succeeds', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'client-request-desk-api' }),
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('Connected: client-request-desk-api');
    });
  });
});
