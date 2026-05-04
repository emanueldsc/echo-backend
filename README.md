# Echo Backend (NestJS + Socket.IO)

Backend realtime para o Echo (Planning Poker), com estado em memoria para o MVP.

## Stack

- NestJS
- Socket.IO
- TypeScript estrito
- Estado in-memory via RoomManager + RoomRepository

## Estrutura principal

```text
src/
  room/
    in-memory-room.repository.ts
    room.manager.ts
    room.module.ts
    room.repository.ts
  voting/
    voting.module.ts
    voting.service.ts
  session/
    echo.gateway.ts
    session.module.ts
    session.service.ts
  shared/
    errors/socket-error.ts
    shared.module.ts
    types/domain.types.ts
    types/dto.ts
    types/socket.types.ts
    utils/event-envelope.ts
  app.controller.ts
  app.module.ts
  main.ts
```

## Como rodar

1. Instalar dependencias:

```bash
npm install
```

2. Rodar em desenvolvimento:

```bash
npm run start:dev
```

3. Backend sobe em:

```text
http://localhost:3000
```

4. Health check:

```text
GET /
```

## CORS

- Origem padrao: http://localhost:4200
- Para customizar:

```bash
set ECHO_FRONTEND_ORIGIN=http://localhost,http://127.0.0.1
set ECHO_FRONT_PORT=4200
```

## Contrato de eventos

Todos os eventos usam envelope padrao:

```json
{
  "event": "room.join",
  "version": "1.0",
  "timestamp": "2026-04-26T10:00:00.000Z",
  "correlationId": "uuid-opcional",
  "roomCode": "ABC123",
  "payload": {}
}
```

### Entrada (client -> server)

- room.create
- room.join
- room.leave
- room.sync.request
- round.start
- vote.submit
- round.reveal
- round.reset
- round.nextItem

### Saida (server -> client)

- room_state_synced
- participant_joined
- participant_left
- round_started
- vote_submitted
- votes_revealed
- round_reset
- next_item_started
- error

## Regras implementadas

- Somente moderador pode: round.start, round.reveal, round.reset, round.nextItem
- Voto unico por participante em cada rodada
- Votos ocultos ate o reveal
- Snapshot de estado sincronizado com room_state_synced
- Erros padronizados no evento error com code e message

## Exemplo Angular (Socket.IO client)

```ts
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  socket.emit('room.create', {
    event: 'room.create',
    version: '1.0',
    timestamp: new Date().toISOString(),
    correlationId: crypto.randomUUID(),
    payload: {
      roomName: 'Sprint Planning',
      participantId: 'p-001',
      participantName: 'Alice',
    },
  });
});

socket.on('room_state_synced', (event) => {
  console.log('room sync', event.payload.room);
});

socket.on('error', (event) => {
  console.error(event.payload.code, event.payload.message);
});
```

## Scripts

- npm run start
- npm run start:dev
- npm run start:prod
- npm run build
- npm run test
- npm run test:e2e
