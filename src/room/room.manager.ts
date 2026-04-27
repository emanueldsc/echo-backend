import { Inject, Injectable } from '@nestjs/common';
import { SocketDomainError } from '../shared/errors/socket-error';
import {
    Participant,
    PublicVote,
    Room,
    RoomStateView,
    RoundState,
    Vote,
    VoteValue,
} from '../shared/types/domain.types';
import type { RoomRepository } from './room.repository';
import { ROOM_REPOSITORY } from './room.repository';

interface LeaveRoomResult {
  roomDeleted: boolean;
  leftParticipant: Participant;
  room: Room | null;
}

interface CreateRoomInput {
  roomName: string;
  participantId: string;
  participantName: string;
}

interface JoinRoomInput {
  roomCode: string;
  participantId: string;
  participantName: string;
}

interface StartRoundInput {
  roomCode: string;
  participantId: string;
  itemId: string;
  itemTitle: string;
}

interface NextItemInput {
  roomCode: string;
  participantId: string;
  itemId: string;
  itemTitle: string;
}

@Injectable()
export class RoomManager {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepository,
  ) {}

  createRoom(input: CreateRoomInput): Room {
    const roomCode = this.generateRoomCode();
    const now = new Date().toISOString();
    const moderator: Participant = {
      participantId: input.participantId,
      name: input.participantName,
      role: 'moderator',
      isOnline: true,
      joinedAt: now,
    };

    const room: Room = {
      roomCode,
      name: input.roomName,
      moderatorId: moderator.participantId,
      participants: [moderator],
      currentRound: null,
      votes: [],
    };

    this.roomRepository.save(room);
    return room;
  }

  joinRoom(input: JoinRoomInput): { room: Room; participant: Participant } {
    const room = this.getRoomOrThrow(input.roomCode);
    const existing = room.participants.find(
      (participant) => participant.participantId === input.participantId,
    );

    if (existing) {
      existing.name = input.participantName;
      existing.isOnline = true;
      this.roomRepository.save(room);
      return { room, participant: existing };
    }

    const participant: Participant = {
      participantId: input.participantId,
      name: input.participantName,
      role: room.moderatorId === input.participantId ? 'moderator' : 'participant',
      isOnline: true,
      joinedAt: new Date().toISOString(),
    };

    room.participants.push(participant);
    this.roomRepository.save(room);
    return { room, participant };
  }

  leaveRoom(
    roomCode: string,
    participantId: string,
    options?: { silentWhenMissing?: boolean },
  ): LeaveRoomResult | null {
    const room = this.roomRepository.findByCode(roomCode);
    if (!room) {
      if (options?.silentWhenMissing) {
        return null;
      }
      throw new SocketDomainError('ROOM_NOT_FOUND', 'Room not found.');
    }

    const participantIndex = room.participants.findIndex(
      (participant) => participant.participantId === participantId,
    );

    if (participantIndex === -1) {
      if (options?.silentWhenMissing) {
        return null;
      }
      throw new SocketDomainError('PARTICIPANT_NOT_FOUND', 'Participant not found in room.');
    }

    const [leftParticipant] = room.participants.splice(participantIndex, 1);

    if (room.participants.length === 0) {
      this.roomRepository.delete(roomCode);
      return {
        roomDeleted: true,
        leftParticipant,
        room: null,
      };
    }

    if (room.moderatorId === participantId) {
      const nextModerator = room.participants[0];
      room.moderatorId = nextModerator.participantId;
      room.participants = room.participants.map((participant) => ({
        ...participant,
        role: participant.participantId === room.moderatorId ? 'moderator' : 'participant',
      }));
    }

    room.votes = room.votes.filter((vote) => vote.participantId !== participantId);
    this.roomRepository.save(room);

    return {
      roomDeleted: false,
      leftParticipant,
      room,
    };
  }

  startRound(input: StartRoundInput): { room: Room; round: RoundState } {
    const room = this.getRoomOrThrow(input.roomCode);
    this.assertModerator(room, input.participantId);

    const currentRoundNumber = room.currentRound?.roundNumber ?? 0;
    const round: RoundState = {
      roundNumber: currentRoundNumber + 1,
      itemId: input.itemId,
      itemTitle: input.itemTitle,
      status: 'voting',
      startedAt: new Date().toISOString(),
    };

    room.currentRound = round;
    room.votes = [];
    this.roomRepository.save(room);
    return { room, round };
  }

  submitVote(roomCode: string, participantId: string, value: VoteValue): { room: Room; vote: Vote } {
    const room = this.getRoomOrThrow(roomCode);
    const participant = this.getParticipantOrThrow(room, participantId);

    if (!room.currentRound || room.currentRound.status !== 'voting') {
      throw new SocketDomainError('ROUND_NOT_ACTIVE', 'Voting is not active for this room.');
    }

    const hasVoted = room.votes.some((vote) => vote.participantId === participantId);
    if (hasVoted) {
      throw new SocketDomainError('ALREADY_VOTED', 'Participant already voted in this round.');
    }

    const vote: Vote = {
      participantId,
      participantName: participant.name,
      value,
      submittedAt: new Date().toISOString(),
    };

    room.votes.push(vote);
    this.roomRepository.save(room);
    return { room, vote };
  }

  revealVotes(roomCode: string, participantId: string): { room: Room; round: RoundState; votes: Vote[] } {
    const room = this.getRoomOrThrow(roomCode);
    this.assertModerator(room, participantId);

    if (!room.currentRound || room.currentRound.status !== 'voting') {
      throw new SocketDomainError('ROUND_NOT_ACTIVE', 'Round is not in voting state.');
    }

    room.currentRound = {
      ...room.currentRound,
      status: 'revealed',
      revealedAt: new Date().toISOString(),
    };

    this.roomRepository.save(room);
    return { room, round: room.currentRound, votes: [...room.votes] };
  }

  resetRound(roomCode: string, participantId: string): { room: Room; round: RoundState } {
    const room = this.getRoomOrThrow(roomCode);
    this.assertModerator(room, participantId);

    if (!room.currentRound) {
      throw new SocketDomainError('ROUND_NOT_ACTIVE', 'Round not found to reset.');
    }

    room.currentRound = {
      ...room.currentRound,
      status: 'waiting',
      revealedAt: undefined,
    };
    room.votes = [];
    this.roomRepository.save(room);
    return { room, round: room.currentRound };
  }

  nextItem(input: NextItemInput): { room: Room; round: RoundState } {
    const room = this.getRoomOrThrow(input.roomCode);
    this.assertModerator(room, input.participantId);

    const currentRoundNumber = room.currentRound?.roundNumber ?? 0;
    const round: RoundState = {
      roundNumber: currentRoundNumber + 1,
      itemId: input.itemId,
      itemTitle: input.itemTitle,
      status: 'voting',
      startedAt: new Date().toISOString(),
    };

    room.currentRound = round;
    room.votes = [];
    this.roomRepository.save(room);
    return { room, round };
  }

  getPublicRoomState(roomCode: string): RoomStateView {
    const room = this.getRoomOrThrow(roomCode);
    const isRevealed = room.currentRound?.status === 'revealed';
    const votes: PublicVote[] = room.votes.map((vote) => ({
      participantId: vote.participantId,
      participantName: vote.participantName,
      submittedAt: vote.submittedAt,
      ...(isRevealed ? { value: vote.value } : {}),
    }));

    const onlineParticipants = room.participants.filter((participant) => participant.isOnline);
    const votedParticipantIds = new Set(room.votes.map((vote) => vote.participantId));
    const missingVotes = onlineParticipants
      .map((participant) => participant.participantId)
      .filter((participantId) => !votedParticipantIds.has(participantId));

    return {
      roomCode: room.roomCode,
      name: room.name,
      moderatorId: room.moderatorId,
      participants: room.participants,
      currentRound: room.currentRound,
      votes,
      stats: {
        onlineCount: onlineParticipants.length,
        votedCount: room.votes.length,
        missingVotes,
      },
    };
  }

  getRoomOrThrow(roomCode: string): Room {
    const room = this.roomRepository.findByCode(roomCode);
    if (!room) {
      throw new SocketDomainError('ROOM_NOT_FOUND', 'Room not found.');
    }
    return room;
  }

  private getParticipantOrThrow(room: Room, participantId: string): Participant {
    const participant = room.participants.find(
      (currentParticipant) => currentParticipant.participantId === participantId,
    );

    if (!participant) {
      throw new SocketDomainError('PARTICIPANT_NOT_FOUND', 'Participant not found.');
    }

    return participant;
  }

  private assertModerator(room: Room, participantId: string): void {
    if (room.moderatorId !== participantId) {
      throw new SocketDomainError('FORBIDDEN', 'Only moderator can execute this action.');
    }
  }

  private generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let candidate = '';

    do {
      candidate = Array.from({ length: 6 }, () =>
        alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
      ).join('');
    } while (this.roomRepository.exists(candidate));

    return candidate;
  }
}