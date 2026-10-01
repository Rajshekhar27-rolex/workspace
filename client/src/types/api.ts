export type RequestStatus = 'NEW' | 'QUALIFIED' | 'CLOSED';

export interface Workspace {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
}

export interface WorkItem {
  id: string;
  workspaceId: string;
  requestId: string;
  scheduledDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  requestId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  details?: string | null;
  createdAt: string;
}

export interface CustomerRequest {
  id: string;
  workspaceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  requestedService: string;
  details?: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  workItem?: WorkItem | null;
  activities?: Activity[];
  _count?: {
    activities: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}
