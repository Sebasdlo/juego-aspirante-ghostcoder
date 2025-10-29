export class AppError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const BadRequest = (m = "Bad Request", d?: unknown) => new AppError(400, m, d);
export const NotFound  = (m = "Not Found", d?: unknown) => new AppError(404, m, d);
export const TooMany   = (m = "Too Many Requests", d?: unknown) => new AppError(429, m, d);
export const ServerErr = (m = "Internal Error", d?: unknown) => new AppError(500, m, d);
