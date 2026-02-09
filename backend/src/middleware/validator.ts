import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'query' | 'body' | 'params' = 'query') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          },
        });
        return;
      }
      next(err);
    }
  };
}
