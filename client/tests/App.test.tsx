import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  {
    id: 'user-bob-2',
    name: 'Bob Bright',
    email: 'bob@brighthorizon.com',
    workspaceId: 'ws-bright-2',
    workspaceName: 'Bright Horizon Cleaning',
  },
];

let mockRequestsAlice: CustomerRequest[] = [];
let mockRequestsBob: CustomerRequest[] = [];

describe('Client Request Desk Frontend Application', () => {
  let fetchMock: any;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    mockRequestsAlice = [
      {
        id: 'req-1',
        workspaceId: 'ws-apex-1',
        customerName: 'Marcus Vance',
        customerEmail: 'marcus@example.com',
        customerPhone: '555-0101',
        requestedService: 'Brake Inspection',
        details: 'Front squeaking noise.',
        status: 'NEW',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
        workItem: null,
        activities: [
          {
            id: 'act-1',
            requestId: 'req-1',
            userId: 'user-alice-1',
            user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
            action: 'CREATED',
            details: 'Initial inquiry logged.',
            createdAt: '2026-10-01T08:00:00.000Z',
          },
        ],
      },
      {
        id: 'req-2',
        workspaceId: 'ws-apex-1',
        customerName: 'Elena Rostova',
        customerEmail: 'elena@example.com',
        customerPhone: '555-0102',
        requestedService: 'Full Synthetic Oil Change',
        details: '50k mile maintenance check.',
        status: 'QUALIFIED',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T09:30:00.000Z',
        workItem: null,
        activities: [
          {
            id: 'act-2',
            requestId: 'req-2',
            userId: 'user-alice-1',
            user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
            action: 'CREATED',
            details: 'Call received.',
            createdAt: '2026-10-01T09:00:00.000Z',
          },
          {
            id: 'act-3',
            requestId: 'req-2',
            userId: 'user-alice-1',
            user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
            action: 'STATUS_CHANGED',
            details: 'Reviewed and qualified.',
            createdAt: '2026-10-01T09:30:00.000Z',
          },
        ],
      },
      {
        id: 'req-3',
        workspaceId: 'ws-apex-1',
        customerName: 'Samantha Green',
        customerEmail: 'sgreen@example.com',
        requestedService: 'Tire Rotation',
        details: 'Routine tire maintenance.',
        status: 'CLOSED',
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-29T11:00:00.000Z',
        workItem: null,
        activities: [],
      },
    ];

    mockRequestsBob = [
      {
        id: 'req-bob-1',
        workspaceId: 'ws-bright-2',
        customerName: 'Acme Logistics',
        customerEmail: 'facilities@acme.com',
        requestedService: 'Commercial Deep Carpet Cleaning',
        status: 'NEW',
        createdAt: '2026-10-01T07:00:00.000Z',
        updatedAt: '2026-10-01T07:00:00.000Z',
        workItem: null,
        activities: [],
      },
    ];

    fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      // 1. GET /api/auth/users
      if (url === '/api/auth/users') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        });
      }

      // 2. GET /api/requests
      if (url.startsWith('/api/requests') && (!options || options.method === 'GET' || !options.method)) {
        const headers = options?.headers as Record<string, string> | undefined;
        const currentUserId = headers?.['x-user-id'] || 'user-alice-1';

        // Check if fetching single request
        const matchSingle = url.match(/\/api\/requests\/([^?]+)/);
        if (matchSingle) {
          const reqId = matchSingle[1];
          const req = [...mockRequestsAlice, ...mockRequestsBob].find((r) => r.id === reqId);
          if (req) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ request: req }),
            });
          }
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
          });
        }

        // Listing requests
        const list = currentUserId === 'user-bob-2' ? mockRequestsBob : mockRequestsAlice;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ requests: list }),
        });
      }

      // 3. POST /api/requests (create)
      if (url === '/api/requests' && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newReq: CustomerRequest = {
          id: 'req-new-created',
          workspaceId: 'ws-apex-1',
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          customerPhone: body.customerPhone || null,
          requestedService: body.requestedService,
          details: body.details || null,
          status: body.status || 'NEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          workItem: null,
          activities: [
            {
              id: 'act-new',
              requestId: 'req-new-created',
              userId: 'user-alice-1',
              user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
              action: 'CREATED',
              details: 'Request registered.',
              createdAt: new Date().toISOString(),
            },
          ],
        };
        mockRequestsAlice.unshift(newReq);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ request: newReq }),
        });
      }

      // 4. POST /api/requests/:id/work-item (convert)
      if (url.includes('/work-item') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        const converted: CustomerRequest = {
          ...mockRequestsAlice[1],
          workItem: {
            id: 'wi-1',
            workspaceId: 'ws-apex-1',
            requestId: mockRequestsAlice[1].id,
            scheduledDate: body.scheduledDate,
            notes: body.notes || null,
            createdAt: new Date().toISOString(),
          },
          activities: [
            ...(mockRequestsAlice[1].activities || []),
            {
              id: 'act-convert',
              requestId: mockRequestsAlice[1].id,
              userId: 'user-alice-1',
              user: { id: 'user-alice-1', name: 'Alice Apex', email: 'alice@apexauto.com' },
              action: 'CONVERTED_TO_WORK_ITEM',
              details: `Converted to work item scheduled for ${body.scheduledDate}.`,
              createdAt: new Date().toISOString(),
            },
          ],
        };

        // Update in mock array
        mockRequestsAlice[1] = converted;

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
  });

  it('renders navbar with active workspace, user switcher, and request list', async () => {
    render(<App />);

    // Wait for users and requests to load
    await waitFor(() => {
      expect(screen.getByTestId('current-workspace-name')).toHaveTextContent('Apex Auto Repair');
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      expect(screen.getByText('Samantha Green')).toBeInTheDocument();
    });
  });

  it('filters requests when clicking status tabs (ALL, NEW, QUALIFIED, CLOSED)', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    });

    // Click 'New' tab
    fireEvent.click(screen.getByTestId('filter-new'));
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();
    expect(screen.queryByText('Samantha Green')).not.toBeInTheDocument();

    // Click 'Qualified' tab
    fireEvent.click(screen.getByTestId('filter-qualified'));
    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.queryByText('Marcus Vance')).not.toBeInTheDocument();

    // Click 'Closed' tab
    fireEvent.click(screen.getByTestId('filter-closed'));
    expect(screen.getByText('Samantha Green')).toBeInTheDocument();
    expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();

    // Return to 'All'
    fireEvent.click(screen.getByTestId('filter-all'));
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
  });

  it('displays request details and activity timeline when a request is selected', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    });

    // Click on Elena's request card
    fireEvent.click(screen.getByText('Elena Rostova'));

    await waitFor(() => {
      expect(screen.getByTestId('detail-customer-name')).toHaveTextContent('Elena Rostova');
      expect(screen.getByTestId('detail-email')).toHaveTextContent('elena@example.com');
      expect(screen.getByTestId('detail-service')).toHaveTextContent('Full Synthetic Oil Change');
    });

    // Verify Activity Timeline is displayed
    expect(screen.getByTestId('activity-timeline')).toBeInTheDocument();
    expect(screen.getByText('Reviewed and qualified.')).toBeInTheDocument();
  });

  it('validates required fields on create request form modal', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('create-request-btn')).toBeInTheDocument();
    });

    // Click "+ New Request"
    fireEvent.click(screen.getByTestId('create-request-btn'));

    expect(screen.getByText('Create Customer Request')).toBeInTheDocument();

    // Attempt to submit empty form
    fireEvent.click(screen.getByTestId('submit-form-btn'));

    // Verify inline validation errors
    expect(screen.getByTestId('error-customer-name')).toHaveTextContent('Customer name must be at least 2 characters.');
    expect(screen.getByTestId('error-customer-email')).toHaveTextContent('Customer email is required.');
    expect(screen.getByTestId('error-requested-service')).toHaveTextContent('Requested service must be at least 2 characters.');

    // Cancel modal
    fireEvent.click(screen.getByTestId('cancel-form-btn'));
    expect(screen.queryByText('Create Customer Request')).not.toBeInTheDocument();
  });

  describe('Human-Confirmed Conversion Flow (MANDATORY)', () => {
    it('does NOT call API on clicking Create Work Item, requires modal confirmation with details', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      // Select Elena Rostova (Status: QUALIFIED)
      fireEvent.click(screen.getByText('Elena Rostova'));

      await waitFor(() => {
        expect(screen.getByTestId('create-work-item-btn')).toBeInTheDocument();
      });

      // Initial fetch call count
      const callsBefore = fetchMock.mock.calls.length;

      // 1. Click 'Create Work Item' button
      fireEvent.click(screen.getByTestId('create-work-item-btn'));

      // 2. Confirmation modal must open
      expect(screen.getByText('Confirm Work Item Conversion')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-customer-name')).toHaveTextContent('Elena Rostova');
      expect(screen.getByTestId('confirm-requested-service')).toHaveTextContent('Full Synthetic Oil Change');
      expect(screen.getByTestId('scheduled-date-picker')).toBeInTheDocument();

      // CRITICAL REQUIREMENT: The API must NOT have been called upon clicking Create Work Item!
      const callsAfterOpen = fetchMock.mock.calls.length;
      expect(callsAfterOpen).toBe(callsBefore);

      // 3. User cancels the confirmation
      fireEvent.click(screen.getByTestId('cancel-convert-btn'));
      expect(screen.queryByText('Confirm Work Item Conversion')).not.toBeInTheDocument();

      // API still not called
      expect(fetchMock.mock.calls.length).toBe(callsBefore);

      // 4. User opens modal again and confirms
      fireEvent.click(screen.getByTestId('create-work-item-btn'));
      expect(screen.getByText('Confirm Work Item Conversion')).toBeInTheDocument();

      // Enter notes
      fireEvent.change(screen.getByTestId('scheduled-notes-input'), {
        target: { value: 'Assigned to bay 1 lead mechanic' },
      });

      // User confirms
      fireEvent.click(screen.getByTestId('confirm-convert-btn'));

      // 5. Verification: API is now called
      await waitFor(() => {
        const convertCall = fetchMock.mock.calls.find((call: any[]) =>
          call[0].includes('/work-item') && call[1]?.method === 'POST'
        );
        expect(convertCall).toBeDefined();
        const sentBody = JSON.parse(convertCall[1].body);
        expect(sentBody.notes).toBe('Assigned to bay 1 lead mechanic');
        expect(sentBody.scheduledDate).toBeDefined();
      });

      // 6. Success toast is displayed
      await waitFor(() => {
        expect(screen.getByTestId('toast-success')).toBeInTheDocument();
        expect(screen.getByText(/Work Item scheduled successfully for Elena Rostova/i)).toBeInTheDocument();
      });

      // 7. Work item banner is displayed in details
      await waitFor(() => {
        expect(screen.getByTestId('scheduled-work-item-banner')).toBeInTheDocument();
      });

      // 8. "Create Work Item" button is no longer visible for this already converted request
      expect(screen.queryByTestId('create-work-item-btn')).not.toBeInTheDocument();
    });
  });

  it('switches workspaces when selecting a different user from the dropdown', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('current-workspace-name')).toHaveTextContent('Apex Auto Repair');
    });

    const switcher = screen.getByTestId('workspace-user-switcher');

    // Switch to Bob Bright (Bright Horizon Cleaning)
    fireEvent.change(switcher, { target: { value: 'user-bob-2' } });

    await waitFor(() => {
      expect(screen.getByTestId('current-workspace-name')).toHaveTextContent('Bright Horizon Cleaning');
      expect(screen.getByText('Acme Logistics')).toBeInTheDocument();
      // Alice's requests must not be visible
      expect(screen.queryByText('Marcus Vance')).not.toBeInTheDocument();
    });
  });
});
