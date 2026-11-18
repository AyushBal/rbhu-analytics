export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'APP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(404, id ? `${entity} '${id}' not found` : `${entity} not found`, 'NOT_FOUND');
  }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, message, 'CONFLICT'); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') { super(401, message, 'UNAUTHORIZED'); }
}
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) { super(400, message, 'BAD_REQUEST', details); }
}
export class UpstreamError extends AppError {
  constructor(message: string) { super(502, message, 'UPSTREAM_ERROR'); }
}
