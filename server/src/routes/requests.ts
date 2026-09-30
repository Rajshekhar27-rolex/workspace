import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  CreateRequestSchema,
  UpdateRequestSchema,
  ListRequestsQuerySchema,
  RequestStatus,
} from '../schemas/requestSchemas';
import { requestService } from '../services/requestService';

export const requestsRouter = Router();

// Require authentication for all request endpoints
requestsRouter.use(authenticate);

/**
 * GET /api/requests
 * List all customer requests belonging to the authenticated user's workspace.
 * Optional query parameter: ?status=NEW|QUALIFIED|CLOSED
 */
requestsRouter.get(
  '/',
  validateQuery(ListRequestsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as RequestStatus | undefined;
      const requests = await requestService.listRequests(req.user!.workspaceId, status);

      res.status(200).json({ requests });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/requests
 * Create a new customer request in the authenticated user's workspace.
 */
requestsRouter.post(
  '/',
  validateBody(CreateRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await requestService.createRequest(
        req.user!.workspaceId,
        req.user!.id,
        req.body
      );

      res.status(201).json({ request: created });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/requests/:id
 * Retrieve single customer request by ID.
 * Returns 404 if not found or if the request belongs to another workspace.
 */
requestsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const request = await requestService.getRequestById(id, req.user!.workspaceId);

    if (!request) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Customer request not found.',
        },
      });
      return;
    }

    res.status(200).json({ request });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/requests/:id
 * Update customer request details or status.
 * Returns 404 if not found or if the request belongs to another workspace.
 */
requestsRouter.patch(
  '/:id',
  validateBody(UpdateRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updated = await requestService.updateRequest(
        id,
        req.user!.workspaceId,
        req.user!.id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Customer request not found.',
          },
        });
        return;
      }

      res.status(200).json({ request: updated });
    } catch (error) {
      next(error);
    }
  }
);
