import { Injectable } from '@nestjs/common';
import { RoomManager } from '../room/room.manager';
import { VoteValue } from '../shared/types/domain.types';

@Injectable()
export class VotingService {
  constructor(private readonly roomManager: RoomManager) {}

  startRound(roomCode: string, participantId: string, itemId: string, itemTitle: string) {
    return this.roomManager.startRound({ roomCode, participantId, itemId, itemTitle });
  }

  submitVote(roomCode: string, participantId: string, value: VoteValue) {
    return this.roomManager.submitVote(roomCode, participantId, value);
  }

  revealVotes(roomCode: string, participantId: string) {
    return this.roomManager.revealVotes(roomCode, participantId);
  }

  resetRound(roomCode: string, participantId: string) {
    return this.roomManager.resetRound(roomCode, participantId);
  }

  nextItem(roomCode: string, participantId: string, itemId: string, itemTitle: string) {
    return this.roomManager.nextItem({ roomCode, participantId, itemId, itemTitle });
  }
}