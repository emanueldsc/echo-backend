import { Module } from '@nestjs/common';
import { RoomModule } from '../room/room.module';
import { VotingModule } from '../voting/voting.module';
import { EchoGateway } from './echo.gateway';
import { SessionService } from './session.service';

@Module({
  imports: [RoomModule, VotingModule],
  providers: [SessionService, EchoGateway],
})
export class SessionModule {}