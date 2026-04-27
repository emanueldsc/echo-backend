import { Injectable } from '@nestjs/common';

interface SessionBinding {
  roomCode: string;
  participantId: string;
}

@Injectable()
export class SessionService {
  private readonly bindingsBySocketId = new Map<string, SessionBinding>();

  bindSocket(socketId: string, roomCode: string, participantId: string): void {
    this.bindingsBySocketId.set(socketId, { roomCode, participantId });
  }

  unbindSocket(socketId: string): SessionBinding | undefined {
    const binding = this.bindingsBySocketId.get(socketId);
    if (binding) {
      this.bindingsBySocketId.delete(socketId);
    }
    return binding;
  }
}