import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(details: any) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}
