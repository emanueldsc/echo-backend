import { Room } from '../shared/types/domain.types';

export const ROOM_REPOSITORY = 'ROOM_REPOSITORY';

export interface RoomRepository {
  findByCode(roomCode: string): Room | undefined;
  save(room: Room): void;
  delete(roomCode: string): void;
  exists(roomCode: string): boolean;
}