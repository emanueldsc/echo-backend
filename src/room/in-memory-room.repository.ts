import { Injectable } from '@nestjs/common';
import { Room } from '../shared/types/domain.types';
import { RoomRepository } from './room.repository';

@Injectable()
export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>();

  findByCode(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  save(room: Room): void {
    this.rooms.set(room.roomCode, room);
  }

  delete(roomCode: string): void {
    this.rooms.delete(roomCode);
  }

  exists(roomCode: string): boolean {
    return this.rooms.has(roomCode);
  }
}