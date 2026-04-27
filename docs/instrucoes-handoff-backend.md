# Handoff Backend - Echo Planning Poker

## Objetivo
Este documento define as instrucoes gerais para a instancia de chat que vai implementar o backend do Echo em outro VS Code.

## Contexto do Projeto
- Frontend Angular: ../echo
- Backend NestJS: ../echo-backend
- Escopo atual: MVP funcional sem banco de dados
- Estado inicial: in-memory
- Comunicacao em tempo real: WebSocket (Socket.IO)

## Meta do MVP
Entregar backend com salas de planning poker em tempo real, com:
- criacao/entrada/saida de sala
- controle de rodada
- votos ocultos e revelacao
- sincronizacao completa de estado
- regras de permissao (moderador vs participante)

## Regras de Dominio Obrigatorias
1. Apenas moderador pode:
- iniciar rodada
- revelar votos
- resetar rodada
- iniciar proximo item

2. Participante pode:
- entrar/sair da sala
- enviar voto na rodada ativa

3. Regras de voto:
- voto permitido somente quando rodada estiver em voting
- um voto por participante por rodada (ou upsert antes de reveal)
- voto oculto ate o evento de reveal

4. Regras de sincronizacao:
- ao entrar/reconectar, sempre enviar snapshot completo da sala
- todos os clientes devem refletir o mesmo estado apos cada evento

## Arquitetura Recomendada
- NestJS + Socket.IO
- Modulos:
  - room
  - session
  - voting
  - shared/types
- Camada de estado in-memory com RoomManager (ou Repository abstrato)
- Separar logica de negocio dos handlers de socket

## Estrutura de Dados Minima
### Participant
- participantId
- name
- role (moderator | participant)
- isOnline
- joinedAt

### Round
- roundNumber
- itemId
- itemTitle
- status (waiting | voting | revealed)
- startedAt
- revealedAt (opcional)

### Vote
- participantId
- participantName
- value (0,1,2,3,5,8,13,21,?,cafe)
- submittedAt

### RoomState
- roomCode
- name
- moderatorId
- participants[]
- currentRound
- votes[]
- stats: onlineCount, votedCount, missingVotes

## Contrato de Eventos (Resumo)
### Client -> Server
- room.create
- room.join
- room.leave
- room.sync.request
- round.start
- vote.submit
- round.reveal
- round.reset
- round.nextItem

### Server -> Client
- room.created
- room.joined
- participant_joined
- participant_left
- room_state_synced
- round_started
- vote_submitted (sem valor do voto)
- votes_revealed (com valores)
- round_reset
- next_item_started
- error

## Envelope Padrao de Evento
Todos os eventos devem aceitar/retornar estrutura padrao:
- event
- version
- timestamp
- correlationId
- roomCode
- payload

## Tratamento de Erros
Emitir evento error com:
- correlationId
- event
- code
- message
- details

Codigos minimos:
- ROOM_NOT_FOUND
- PARTICIPANT_NOT_FOUND
- FORBIDDEN
- ROUND_NOT_ACTIVE
- ALREADY_VOTED
- INVALID_VOTE
- VALIDATION_ERROR
- INTERNAL_ERROR

## Fases de Implementacao (ordem sugerida)
1. Setup inicial do NestJS e Socket.IO
2. Modelos e RoomManager in-memory
3. Handlers de room.create/join/leave/sync
4. Handlers de round.start/vote.submit/reveal/reset/nextItem
5. Broadcast e sincronizacao por sala
6. Validacoes de regra de negocio
7. Erros padronizados
8. Teste manual com 2 clientes conectados

## Critérios de Pronto
- Dois clientes conectados veem estado sincronizado em tempo real
- Moderador controla ciclo completo de 4 rodadas sem inconsistencias
- Participante nao consegue executar acoes de moderador
- Votos ficam ocultos ate reveal
- Reconexao retorna snapshot consistente

## Comandos Basicos Esperados
- instalar dependencias
- rodar em modo dev
- validar lint/test (se configurado)

## Entregavel Esperado da Outra Instancia
Ao final, a outra instancia deve devolver:
1. estrutura de pastas criada
2. principais arquivos implementados
3. lista de eventos socket suportados
4. instrucoes para rodar backend localmente
5. exemplo rapido de conexao do frontend

## Observacoes
- Nao implementar banco agora
- Manter arquitetura preparada para migracao futura para persistencia
- Priorizar previsibilidade do estado e clareza dos contratos de evento
