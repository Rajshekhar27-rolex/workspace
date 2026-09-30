export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
