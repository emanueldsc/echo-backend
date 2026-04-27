export const VOTE_VALUES = [0, 1, 2, 3, 5, 8, 13, 21, '?', 'cafe'] as const;

export type VoteValue = (typeof VOTE_VALUES)[number];
export type ParticipantRole = 'moderator' | 'participant';
export type RoundStatus = 'waiting' | 'voting' | 'revealed';

export interface Participant {
  participantId: string;
  name: string;
  role: ParticipantRole;
  isOnline: boolean;
  joinedAt: string;
}

export interface RoundState {
  roundNumber: number;
  itemId: string;
  itemTitle: string;
  status: RoundStatus;
  startedAt: string;
  revealedAt?: string;
}

export interface Vote {
  participantId: string;
  participantName: string;
  value: VoteValue;
  submittedAt: string;
}

export interface Room {
  roomCode: string;
  name: string;
  moderatorId: string;
  participants: Participant[];
  currentRound: RoundState | null;
  votes: Vote[];
}

export interface RoomStats {
  onlineCount: number;
  votedCount: number;
  missingVotes: string[];
}

export type PublicVote = Omit<Vote, 'value'> & { value?: VoteValue };

export interface RoomStateView {
  roomCode: string;
  name: string;
  moderatorId: string;
  participants: Participant[];
  currentRound: RoundState | null;
  votes: PublicVote[];
  stats: RoomStats;
}