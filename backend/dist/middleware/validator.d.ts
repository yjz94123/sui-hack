import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validate(schema: ZodSchema, source?: 'query' | 'body' | 'params'): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validator.d.ts.map