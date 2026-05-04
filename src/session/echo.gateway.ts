import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { RoomManager } from '../room/room.manager';
import { SocketDomainError } from '../shared/errors/socket-error';
import {
    ClientEnvelopeDto,
    RoomCreatePayloadDto,
    RoomJoinPayloadDto,
    RoomLeavePayloadDto,
    RoomSyncRequestPayloadDto,
    RoundNextItemPayloadDto,
    RoundResetPayloadDto,
    RoundRevealPayloadDto,
    RoundStartPayloadDto,
    VoteSubmitPayloadDto,
} from '../shared/types/dto';
import {
    ErrorEventPayload,
    EventEnvelope,
    NextItemStartedPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    RoomStateSyncedPayload,
    RoundResetPayload,
    RoundStartedPayload,
    VoteSubmittedPayload,
    VotesRevealedPayload,
} from '../shared/types/socket.types';
import { buildEventEnvelope } from '../shared/utils/event-envelope';
import { getFrontendOrigins } from '../shared/utils/frontend-origin';
import { VotingService } from '../voting/voting.service';
import { SessionService } from './session.service';

interface ParsedIncoming<TPayload> {
  roomCode?: string;
  correlationId: string;
  payload: TPayload;
}

@WebSocketGateway({
  cors: {
    origin: getFrontendOrigins(),
    credentials: true,
  },
})
export class EchoGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(EchoGateway.name);

  constructor(
    private readonly roomManager: RoomManager,
    private readonly votingService: VotingService,
    private readonly sessionService: SessionService,
  ) {}

  @SubscribeMessage('room.create')
  handleRoomCreate(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'room.create', body, (input) => {
      const parsed = this.parseIncoming('room.create', input, RoomCreatePayloadDto);
      const room = this.roomManager.createRoom({
        roomName: parsed.payload.roomName,
        participantId: parsed.payload.participantId,
        participantName: parsed.payload.participantName,
      });

      client.join(room.roomCode);
      this.sessionService.bindSocket(client.id, room.roomCode, parsed.payload.participantId);
      this.emitRoomState(client, room.roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('room.join')
  handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'room.join', body, (input) => {
      const parsed = this.parseIncoming('room.join', input, RoomJoinPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const joined = this.roomManager.joinRoom({
        roomCode,
        participantId: parsed.payload.participantId,
        participantName: parsed.payload.participantName,
      });

      client.join(roomCode);
      this.sessionService.bindSocket(client.id, roomCode, parsed.payload.participantId);

      this.emitToRoom<ParticipantJoinedPayload>(
        roomCode,
        'participant_joined',
        { participant: joined.participant },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('room.leave')
  handleRoomLeave(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'room.leave', body, (input) => {
      const parsed = this.parseIncoming('room.leave', input, RoomLeavePayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.roomManager.leaveRoom(roomCode, parsed.payload.participantId);

      this.sessionService.unbindSocket(client.id);
      client.leave(roomCode);

      if (!result || result.roomDeleted) {
        return;
      }

      this.emitToRoom<ParticipantLeftPayload>(
        roomCode,
        'participant_left',
        { participantId: result.leftParticipant.participantId },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('room.sync.request')
  handleRoomSyncRequest(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'room.sync.request', body, (input) => {
      const parsed = this.parseIncoming('room.sync.request', input, RoomSyncRequestPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      this.roomManager.getRoomOrThrow(roomCode);
      this.emitRoomState(client, roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('round.start')
  handleRoundStart(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'round.start', body, (input) => {
      const parsed = this.parseIncoming('round.start', input, RoundStartPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.votingService.startRound(
        roomCode,
        parsed.payload.participantId,
        parsed.payload.itemId,
        parsed.payload.itemTitle,
      );

      this.emitToRoom<RoundStartedPayload>(
        roomCode,
        'round_started',
        { round: result.round },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('vote.submit')
  handleVoteSubmit(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'vote.submit', body, (input) => {
      const parsed = this.parseIncoming('vote.submit', input, VoteSubmitPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.votingService.submitVote(
        roomCode,
        parsed.payload.participantId,
        parsed.payload.value,
      );

      const roundNumber = result.room.currentRound?.roundNumber;
      if (!roundNumber) {
        throw new SocketDomainError('ROUND_NOT_ACTIVE', 'Round not found after vote submission.');
      }

      this.emitToRoom<VoteSubmittedPayload>(
        roomCode,
        'vote_submitted',
        {
          participantId: parsed.payload.participantId,
          roundNumber,
          votedCount: result.room.votes.length,
        },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('round.reveal')
  handleRoundReveal(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'round.reveal', body, (input) => {
      const parsed = this.parseIncoming('round.reveal', input, RoundRevealPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.votingService.revealVotes(roomCode, parsed.payload.participantId);

      this.emitToRoom<VotesRevealedPayload>(
        roomCode,
        'votes_revealed',
        {
          round: result.round,
          votes: result.votes,
        },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('round.reset')
  handleRoundReset(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'round.reset', body, (input) => {
      const parsed = this.parseIncoming('round.reset', input, RoundResetPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.votingService.resetRound(roomCode, parsed.payload.participantId);

      this.emitToRoom<RoundResetPayload>(
        roomCode,
        'round_reset',
        { round: result.round },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  @SubscribeMessage('round.nextItem')
  handleRoundNextItem(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): void {
    this.runSafely(client, 'round.nextItem', body, (input) => {
      const parsed = this.parseIncoming('round.nextItem', input, RoundNextItemPayloadDto);
      const roomCode = parsed.payload.roomCode.toUpperCase();
      const result = this.votingService.nextItem(
        roomCode,
        parsed.payload.participantId,
        parsed.payload.itemId,
        parsed.payload.itemTitle,
      );

      this.emitToRoom<NextItemStartedPayload>(
        roomCode,
        'next_item_started',
        { round: result.round },
        parsed.correlationId,
      );
      this.emitRoomStateToRoom(roomCode, parsed.correlationId);
    });
  }

  handleDisconnect(client: Socket): void {
    const binding = this.sessionService.unbindSocket(client.id);
    if (!binding) {
      return;
    }

    try {
      const result = this.roomManager.leaveRoom(binding.roomCode, binding.participantId, {
        silentWhenMissing: true,
      });
      if (!result || result.roomDeleted) {
        return;
      }

      this.emitToRoom<ParticipantLeftPayload>(binding.roomCode, 'participant_left', {
        participantId: result.leftParticipant.participantId,
      });
      this.emitRoomStateToRoom(binding.roomCode);
    } catch (error) {
      this.logger.warn('Failed to process disconnect flow', error);
    }
  }

  private runSafely(
    client: Socket,
    expectedEvent: string,
    body: unknown,
    callback: (input: unknown) => void,
  ): void {
    try {
      callback(body);
    } catch (error) {
      this.emitError(client, expectedEvent, error);
    }
  }

  private parseIncoming<TPayload>(
    expectedEvent: string,
    input: unknown,
    payloadClass: ClassConstructor<TPayload>,
  ): ParsedIncoming<TPayload> {
    const envelope = plainToInstance(ClientEnvelopeDto, input);
    const envelopeErrors = validateSync(envelope, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (envelopeErrors.length > 0) {
      throw new SocketDomainError('VALIDATION_ERROR', 'Invalid event envelope.', envelopeErrors);
    }

    if (envelope.event !== expectedEvent) {
      throw new SocketDomainError(
        'VALIDATION_ERROR',
        `Event mismatch. Expected ${expectedEvent} and received ${envelope.event}.`,
      );
    }

    const payload = plainToInstance(payloadClass, envelope.payload);
    const payloadErrors = validateSync(payload as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (payloadErrors.length > 0) {
      throw new SocketDomainError('VALIDATION_ERROR', 'Invalid event payload.', payloadErrors);
    }

    return {
      roomCode: envelope.roomCode,
      correlationId: envelope.correlationId ?? randomUUID(),
      payload,
    };
  }

  private emitRoomState(client: Socket, roomCode: string, correlationId?: string): void {
    const roomState = this.roomManager.getPublicRoomState(roomCode);
    client.emit(
      'room_state_synced',
      buildEventEnvelope<RoomStateSyncedPayload>(
        'room_state_synced',
        { room: roomState },
        { correlationId, roomCode },
      ),
    );
  }

  private emitRoomStateToRoom(roomCode: string, correlationId?: string): void {
    const roomState = this.roomManager.getPublicRoomState(roomCode);
    this.emitToRoom<RoomStateSyncedPayload>(
      roomCode,
      'room_state_synced',
      { room: roomState },
      correlationId,
    );
  }

  private emitToRoom<TPayload>(
    roomCode: string,
    event: string,
    payload: TPayload,
    correlationId?: string,
  ): void {
    this.server.to(roomCode).emit(
      event,
      buildEventEnvelope<TPayload>(event, payload, { correlationId, roomCode }),
    );
  }

  private emitError(client: Socket, event: string, error: unknown): void {
    const domainError =
      error instanceof SocketDomainError
        ? error
        : new SocketDomainError('INTERNAL_ERROR', 'Internal server error.');

    const payload: ErrorEventPayload = {
      event,
      code: domainError.code,
      message: domainError.message,
      details: domainError.details,
    };

    const envelope: EventEnvelope<ErrorEventPayload> = buildEventEnvelope('error', payload);
    client.emit('error', envelope);
  }
}