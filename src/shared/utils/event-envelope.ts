import { randomUUID } from 'node:crypto';
import { EventEnvelope } from '../types/socket.types';

export function buildEventEnvelope<TPayload>(
  event: string,
  payload: TPayload,
  options?: { correlationId?: string; roomCode?: string },
): EventEnvelope<TPayload> {
  return {
    event,
    version: '1.0',
    timestamp: new Date().toISOString(),
    correlationId: options?.correlationId ?? randomUUID(),
    roomCode: options?.roomCode,
    payload,
  };
}