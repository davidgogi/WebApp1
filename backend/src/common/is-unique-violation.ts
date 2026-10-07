import { QueryFailedError } from 'typeorm';

// True when a database write failed because it broke a UNIQUE constraint (PostgreSQL code 23505).
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === '23505';
}
