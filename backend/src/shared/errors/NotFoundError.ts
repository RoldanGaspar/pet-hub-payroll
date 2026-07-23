import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(entity: string, id: number | string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}
