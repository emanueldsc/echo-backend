import { Participant, RoomStateView, RoundState, Vote } from './domain.types';

export interface EventEnvelope<TPayload> {
  event: string;
  version: string;
  timestamp: string;
  correlationId: string;
  roomCode?: string;
  payload: TPayload;
}

export interface ErrorEventPayload {
  event: string;
  code: string;
  message: string;
  details?: unknown;
}

export interface RoomStateSyncedPayload {
  room: RoomStateView;
}

export interface ParticipantJoinedPayload {
  participant: Participant;
}

export interface ParticipantLeftPayload {
  participantId: string;
}

export interface RoundStartedPayload {
  round: RoundState;
}

export interface VoteSubmittedPayload {
  participantId: string;
  roundNumber: number;
  votedCount: number;
}

export interface VotesRevealedPayload {
  round: RoundState;
  votes: Vote[];
}

export interface RoundResetPayload {
  round: RoundState;
}

export interface NextItemStartedPayload {
  round: RoundState;
}