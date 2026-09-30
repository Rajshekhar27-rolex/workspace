import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

/**
 * GET /api/auth/users
 * Returns available seeded users and workspaces for simple switching/mock login.
 */
authRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      workspaceId: u.workspaceId,
      workspaceName: u.workspace.name,
    }));

    res.status(200).json({ users: sanitizedUsers });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve available users.',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Allows logging in with either userId or email.
 * Returns user details and the token/header value to use.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide either userId or email to log in.',
        },
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          userId ? { id: userId } : undefined,
          email ? { email: email.toLowerCase() } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        workspace: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'User not found.',
        },
      });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId,
        workspaceName: user.workspace.name,
      },
      token: user.id,
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed due to an unexpected error.',
      },
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning the currently authenticated user and their workspace.
 */
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user,
  });
});
