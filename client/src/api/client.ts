import { User, CustomerRequest, WorkItem, ApiError } from '../types/api';

class ApiClient {
  private activeUserId: string | null = null;

  setUserId(userId: string | null) {
    this.activeUserId = userId;
  }

  getUserId(): string | null {
    return this.activeUserId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.activeUserId) {
      headers['x-user-id'] = this.activeUserId;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiError | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Not a JSON error
      }

      if (errorData?.error) {
        const error = new Error(errorData.error.message) as Error & {
          code: string;
          details?: Array<{ field?: string; message: string }>;
          status: number;
        };
        error.code = errorData.error.code;
        error.details = errorData.error.details;
        error.status = response.status;
        throw error;
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getAvailableUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>('/api/auth/users');
  }

  async getMe(userId?: string): Promise<{ user: User }> {
    const previous = this.activeUserId;
    if (userId) this.activeUserId = userId;
    try {
      return await this.request<{ user: User }>('/api/auth/me');
    } finally {
      if (userId && !previous) {
        // Keep or restore
      }
    }
  }

  async listRequests(status?: string): Promise<{ requests: CustomerRequest[] }> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<{ requests: CustomerRequest[] }>(`/api/requests${query}`);
  }

  async getRequest(id: string): Promise<{ request: CustomerRequest }> {
    return this.request<{ request: CustomerRequest }>(`/api/requests/${id}`);
  }

  async createRequest(data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    requestedService: string;
    details?: string | null;
    status?: string;
  }): Promise<{ request: CustomerRequest }> {
    return this.request<{ request: CustomerRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRequest(
    id: string,
    data: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string | null;
      requestedService?: string;
      details?: string | null;
      status?: string;
    }
  ): Promise<{ request: CustomerRequest }> {
    return this.request<{ request: CustomerRequest }>(`/api/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async convertToWorkItem(
    id: string,
    data: { scheduledDate: string; notes?: string | null }
  ): Promise<{ workItem: WorkItem; request: CustomerRequest }> {
    return this.request<{ workItem: WorkItem; request: CustomerRequest }>(
      `/api/requests/${id}/work-item`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }
}

export const api = new ApiClient();
