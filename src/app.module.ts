import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomModule } from './room/room.module';
import { SessionModule } from './session/session.module';
import { SharedModule } from './shared/shared.module';
import { VotingModule } from './voting/voting.module';

@Module({
  imports: [SharedModule, RoomModule, VotingModule, SessionModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
