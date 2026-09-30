import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import '../types/auth';

/**
 * Authentication middleware for mock/development authentication.
 *
 * Resolves the authenticated user via:
 * 1. 'x-user-id' header
 * 2. 'Authorization: Bearer <userId>' header
 *
 * CRITICAL MULTI-TENANT SECURITY GUARANTEE:
 * - 'workspaceId' is NEVER accepted or read from client headers, query, or body.
 * - 'workspaceId' is strictly derived from the verified user record in SQLite.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId: string | undefined;

    // Check x-user-id header
    const headerUserId = req.headers['x-user-id'];
    if (typeof headerUserId === 'string' && headerUserId.trim() !== '') {
      userId = headerUserId.trim();
    }

    // Check Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        userId = token;
      }
    }

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid x-user-id header or Bearer token.',
        },
      });
      return;
    }

    // Query user and their associated workspace from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'User not found or credentials invalid.',
        },
      });
      return;
    }

    // Establish verified identity strictly from the database
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: user.workspaceId,
      workspaceName: user.workspace.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}
