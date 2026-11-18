import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface Schemas { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }

/** Validates and replaces body/query/params with the parsed (typed, stripped, coerced) values. */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true });
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (e) {
      next(e); // ZodError is mapped to a 400 by the error handler
    }
  };
