import { Module } from '@nestjs/common';
import { RoomModule } from '../room/room.module';
import { VotingService } from './voting.service';

@Module({
  imports: [RoomModule],
  providers: [VotingService],
  exports: [VotingService],
})
export class VotingModule {}