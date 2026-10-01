import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { User, CustomerRequest } from '../src/types/api';

const mockUsers: User[] = [
  {
    id: 'user-alice-1',
    name: 'Alice Apex',
    email: 'alice@apexauto.com',
    workspaceId: 'ws-apex-1',
    workspaceName: 'Apex Auto Repair',
  },
];

let mockQualifiedRequest: CustomerRequest;

describe('Milestone 7: Human-Confirmed Work Item Conversion Flow (user-event)', () => {
  let fetchMock: any;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    mockQualifiedRequest = {
      id: 'req-qual-100',
      workspaceId: 'ws-apex-1',
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.vance@example.com',
      customerPhone: '555-0199',
      requestedService: 'Full Brake Pad & Rotor Replacement',
      details: 'Customer reports metal-on-metal grinding sound.',
      status: 'QUALIFIED',
      createdAt: '2026-10-01T08:30:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
      workItem: null,
      activities: [
        {
          id: 'act-1',
          requestId: 'req-qual-100',
          userId: 'user-alice-1',
          user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
          action: 'CREATED',
          details: 'Online inquiry logged.',
          createdAt: '2026-10-01T08:30:00.000Z',
        },
        {
          id: 'act-2',
          requestId: 'req-qual-100',
          userId: 'user-alice-1',
          user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
          action: 'STATUS_CHANGED',
          details: 'Diagnostics verified; marked QUALIFIED.',
          createdAt: '2026-10-01T09:00:00.000Z',
        },
      ],
    };
  });

  it('executes human-confirmed conversion flow: modal review, zero premature API calls, user confirmation, and success feedback', async () => {
    const user = userEvent.setup();

    fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/auth/users') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        });
      }

      if (url.startsWith('/api/requests') && (!options || options.method === 'GET' || !options.method)) {
        if (url.includes('/req-qual-100')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ request: mockQualifiedRequest }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ requests: [mockQualifiedRequest] }),
        });
      }

      if (url.includes('/work-item') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const converted: CustomerRequest = {
          ...mockQualifiedRequest,
          workItem: {
            id: 'wi-marcus-1',
            workspaceId: 'ws-apex-1',
            requestId: mockQualifiedRequest.id,
            scheduledDate: body.scheduledDate,
            notes: body.notes || null,
            createdAt: new Date().toISOString(),
          },
          activities: [
            ...(mockQualifiedRequest.activities || []),
            {
              id: 'act-3',
              requestId: mockQualifiedRequest.id,
              userId: 'user-alice-1',
              user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
              action: 'CONVERTED_TO_WORK_ITEM',
              details: `Converted to work item scheduled for ${body.scheduledDate}.`,
              createdAt: new Date().toISOString(),
            },
          ],
        };

        mockQualifiedRequest = converted;

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workItem: converted.workItem,
              request: converted,
            }),
        });
      }

      return Promise.reject(new Error(`Unhandled mock request: ${url}`));
    });

    globalThis.fetch = fetchMock;

    // 1. Render Application with QUALIFIED request
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    });

    // Select the qualified request to view details
    await user.click(screen.getByText('Marcus Vance'));

    await waitFor(() => {
      expect(screen.getByTestId('detail-customer-name')).toHaveTextContent('Marcus Vance');
      expect(screen.getByTestId('create-work-item-btn')).toBeInTheDocument();
    });

    const callsBeforeClick = fetchMock.mock.calls.length;

    // 2. User clicks "Create Work Item"
    await user.click(screen.getByTestId('create-work-item-btn'));

    // 3. Confirmation modal appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Work Item Conversion')).toBeInTheDocument();

    // 4. Modal displays:
    // - customer
    // - requested service
    // - scheduled date
    expect(screen.getByTestId('confirm-customer-name')).toHaveTextContent('Marcus Vance');
    expect(screen.getByTestId('confirm-requested-service')).toHaveTextContent(
      'Full Brake Pad & Rotor Replacement'
    );
    const datePicker = screen.getByTestId('scheduled-date-picker') as HTMLInputElement;
    expect(datePicker).toBeInTheDocument();
    expect(datePicker.value).not.toBe('');

    // 5. API is NOT called before confirmation
    const convertCallsBeforeConfirm = fetchMock.mock.calls.filter((c: any[]) =>
      c[0].includes('/work-item')
    );
    expect(convertCallsBeforeConfirm.length).toBe(0);
    // Overall network calls did not increase
    expect(fetchMock.mock.calls.length).toBe(callsBeforeClick);

    // Optional: type additional technician notes
    const notesInput = screen.getByTestId('scheduled-notes-input');
    await user.type(notesInput, 'Priority service - customer waiting in lobby');

    // 6. User confirms the action
    await user.click(screen.getByTestId('confirm-convert-btn'));

    // 7. API is called with appropriate payload
    await waitFor(() => {
      const convertCalls = fetchMock.mock.calls.filter((c: any[]) =>
        c[0].includes('/work-item') && c[1]?.method === 'POST'
      );
      expect(convertCalls.length).toBe(1);

      const [targetUrl, requestOptions] = convertCalls[0];
      expect(targetUrl).toBe('/api/requests/req-qual-100/work-item');
      const payload = JSON.parse(requestOptions.body);
      expect(payload.scheduledDate).toBeDefined();
      expect(payload.notes).toBe('Priority service - customer waiting in lobby');
    });

    // 8. Successful response produces appropriate UI feedback:
    // - Success toast notification
    // - Scheduled work item banner in details view
    // - Modal is closed
    await waitFor(() => {
      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(
        screen.getByText(/Work Item scheduled successfully for Marcus Vance/i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('scheduled-work-item-banner')).toBeInTheDocument();
      expect(screen.getByText(/Notes: Priority service - customer waiting in lobby/i)).toBeInTheDocument();
    });

    // "Create Work Item" button is no longer visible on converted item
    expect(screen.queryByTestId('create-work-item-btn')).not.toBeInTheDocument();
  });

  it('handles conversion API error state gracefully (e.g. 409 Duplicate Conversion)', async () => {
    const user = userEvent.setup();

    fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/auth/users') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        });
      }

      if (url.startsWith('/api/requests') && (!options || options.method === 'GET' || !options.method)) {
        if (url.includes('/req-qual-100')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ request: mockQualifiedRequest }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ requests: [mockQualifiedRequest] }),
        });
      }

      // Simulate 409 Conflict from backend
      if (url.includes('/work-item') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: {
                code: 'ALREADY_CONVERTED',
                message: 'A work item has already been created for this customer request.',
              },
            }),
        });
      }

      return Promise.reject(new Error(`Unhandled mock request: ${url}`));
    });

    globalThis.fetch = fetchMock;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Marcus Vance'));

    await waitFor(() => {
      expect(screen.getByTestId('create-work-item-btn')).toBeInTheDocument();
    });

    // Open confirmation modal
    await user.click(screen.getByTestId('create-work-item-btn'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirm conversion
    await user.click(screen.getByTestId('confirm-convert-btn'));

    // Verify error UI state: toast error banner displays helpful message
    await waitFor(() => {
      expect(screen.getByTestId('toast-error')).toBeInTheDocument();
      expect(
        screen.getByText(/A work item has already been created for this customer request/i)
      ).toBeInTheDocument();
    });
  });
});
