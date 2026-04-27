import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { VOTE_VALUES } from './domain.types';

export class RoomCreatePayloadDto {
  @IsString()
  @Length(1, 80)
  roomName!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;

  @IsString()
  @Length(1, 80)
  participantName!: string;
}

export class RoomJoinPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;

  @IsString()
  @Length(1, 80)
  participantName!: string;
}

export class RoomLeavePayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;
}

export class RoomSyncRequestPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;
}

export class RoundStartPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;

  @IsString()
  @Length(1, 64)
  itemId!: string;

  @IsString()
  @Length(1, 120)
  itemTitle!: string;
}

export class VoteSubmitPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;

  @IsIn(VOTE_VALUES)
  value!: (typeof VOTE_VALUES)[number];
}

export class RoundRevealPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;
}

export class RoundResetPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;
}

export class RoundNextItemPayloadDto {
  @IsString()
  @Length(4, 10)
  roomCode!: string;

  @IsString()
  @Length(1, 64)
  participantId!: string;

  @IsString()
  @Length(1, 64)
  itemId!: string;

  @IsString()
  @Length(1, 120)
  itemTitle!: string;
}

export class ClientEnvelopeDto {
  @IsString()
  @Length(1, 64)
  event!: string;

  @IsString()
  @Length(1, 16)
  version!: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  roomCode?: string;

  @IsNotEmpty()
  payload!: Record<string, unknown>;
}