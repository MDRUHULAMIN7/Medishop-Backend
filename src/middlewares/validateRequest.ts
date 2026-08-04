import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
