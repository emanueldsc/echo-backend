import { Module } from '@nestjs/common';
import { InMemoryRoomRepository } from './in-memory-room.repository';
import { RoomManager } from './room.manager';
import { ROOM_REPOSITORY } from './room.repository';

@Module({
  providers: [
    RoomManager,
    InMemoryRoomRepository,
    {
      provide: ROOM_REPOSITORY,
      useExisting: InMemoryRoomRepository,
    },
  ],
  exports: [RoomManager],
})
export class RoomModule {}