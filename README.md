# Project Blackout — Matchmaking API Server

4인 Co-op PvE 보스 레이드 TPS 게임의 매치메이킹 API 서버 (R&D)

## 기술 스택

- **Framework**: NestJS (TypeScript)
- **Runtime**: Node.js
- **Package Manager**: pnpm
- **Database**: Redis (Docker)
- **Protocol**: HTTP (:3000) + WebSocket (:3001)
- **Auth**: JWT (@nestjs/jwt)
- **Security**: Helmet, Rate Limiting (@nestjs/throttler)

## 아키텍처

```
[언리얼 클라이언트]
  │ HTTP — 인증, 매칭, 세션 CRUD
  │ WS   — 로비 실시간, 매칭 알림
  ▼
[Nest.js API 서버]
  ├─ JWT 인증 (24h)
  ├─ Rate Limiting (1분/30회)
  ├─ DTO 입력값 검증 (class-validator)
  ├─ Helmet 보안 헤더
  ├─ 세션 CRUD → Redis
  ├─ WS Room 기반 메시징 (세션별 격리)
  ├─ Redis 키 만료 이벤트 구독 → 매칭 타임아웃 알림
  │    ▼
[Redis :6379]
  ├─ session:{id}    → 방 정보 (waiting: TTL 3분 / playing: 무제한)
  ├─ player:{name}   → 중복 참가 방지 (TTL 1시간, SET NX 원자적 선점)
  └─ token:{token}   → 입장 토큰 (TTL 30초)
```

## 구현 완료

- [x] 세션 CRUD (생성/조회/참가/삭제)
- [x] Redis TTL 정책 (waiting 3분 자동 만료 / playing 무제한)
- [x] 중복 참가 방지 (SET NX 원자적 선점, TOCTOU race-safe)
- [x] DTO + class-validator 입력값 검증
- [x] WebSocket Room 기반 메시징 (세션별 격리)
- [x] 매칭 타임아웃 → WS 알림 (Redis keyevent expired 구독)
- [x] 좀비 player 키 자동 정리 (SCAN + 역추적)
- [x] JWT 인증 (발급 + Guard)
- [x] Rate Limiting (@nestjs/throttler, IP당 1분/30회)
- [x] Helmet 보안 헤더

## 구현 예정

- [ ] 서버 풀 관리 (등록/배정/해제)
- [ ] 입장 토큰 발급/검증 (일회용, TTL 30초)
- [ ] 서버 IP 마스킹 (playing 참가자에게만 노출)
- [ ] 언리얼 FHttpModule / IWebSocket 연동 테스트

## 사전 요구사항

- Node.js 22+
- pnpm
- Docker (Redis 용)

## 실행

```bash
# Redis 실행 (키 만료 이벤트 활성화)
docker run -d --name redis -p 6379:6379 redis --requirepass "blackout2026" --notify-keyspace-events Ex

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm start:dev
```

서버가 뜨면:
- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:3001`

## API 엔드포인트

### 인증

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/auth/login` | JWT 발급 | - |

### 세션

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | `/sessions` | 방 생성 | JWT |
| GET | `/sessions` | 방 목록 | JWT |
| GET | `/sessions/:id` | 방 상세 | JWT |
| POST | `/sessions/:id/join` | 방 참가 | JWT |
| DELETE | `/sessions/:id` | 방 삭제 | JWT |

### WebSocket (`ws://localhost:3001`)

| Event | 방향 | 설명 |
|-------|------|------|
| `hi` | S→C | 접속 시 환영 메시지 |
| `join_session` | C→S | 세션 룸 참가 `{sessionId}` |
| `joined_session` | S→C | 참가 확인 `{sessionId, count}` |
| `leave_session` | C→S | 세션 룸 퇴장 |
| `left_session` | S→C | 퇴장 확인 |
| `matchmaking_failed` | S→C | 매칭 타임아웃 알림 |
| `ping` | C→S | 연결 확인 |
| `pong` | S→C | 핑 응답 `{timestamp}` |

## 프로젝트 구조

```
src/
├── auth/
│   ├── auth.module.ts          # JWT 모듈 등록
│   ├── auth.controller.ts      # POST /auth/login
│   └── jwt-auth.guard.ts       # Bearer 토큰 검증 Guard
├── session/
│   ├── dto/
│   │   ├── create-session.dto.ts
│   │   └── join-session.dto.ts
│   ├── session.module.ts
│   ├── session.controller.ts   # 세션 CRUD 라우트
│   ├── session.service.ts      # Redis 세션 관리 + SET NX 선점
│   ├── session.interfaces.ts   # GameSession 인터페이스
│   └── session-expiration.listener.ts  # Redis 키 만료 구독 + 좀비 정리
├── events.module.ts
├── events.gateway.ts           # WebSocket Room 기반 메시징
├── app.module.ts               # 루트 모듈 (Throttler, Redis, Auth)
├── app.controller.ts           # 헬스체크
├── app.service.ts
└── main.ts                     # 부트스트랩 (Helmet, ValidationPipe, WsAdapter)
```

## Redis 키 구조

| 키 패턴 | 값 | TTL | 용도 |
|---------|-----|-----|------|
| `session:{uuid}` | GameSession JSON | waiting: 3분 / playing: 무제한 | 매치 세션 정보 |
| `player:{name}` | sessionId | 1시간 | 중복 참가 방지 (SET NX) |
| `token:{uuid}` | sessionId | 30초 | 일회용 입장 토큰 (예정) |

## License

MIT
