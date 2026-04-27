export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'PARTICIPANT_NOT_FOUND'
  | 'FORBIDDEN'
  | 'ROUND_NOT_ACTIVE'
  | 'ALREADY_VOTED'
  | 'INVALID_VOTE'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export class SocketDomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SocketDomainError';
  }
}