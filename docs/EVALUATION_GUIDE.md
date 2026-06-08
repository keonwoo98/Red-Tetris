# Red Tetris — 평가 방어 가이드 (Evaluation Guide)

> 이 문서는 42 **Red Tetris (v5.2)** 동료 평가에서 프로젝트를 **설명·정당화·시연**하기 위한 가이드입니다.
> 각 섹션은 **개념 → 스펙 근거 → 동작 방식 → 구현(`file:line`) → 평가 멘트 → 시연** 순서로 되어 있어, 위에서 아래로 따라가면 됩니다.

---

## 1. 개요 & 평가 진행 방식

### 한 줄 요약
네트워크 멀티플레이 Tetris. **클라이언트는 순수 함수 + React(무 `this`)**, **서버는 OOP(Node + socket.io)**. 모든 플레이어가 **하나의 seed로 동일한 조각**을 받고, 라인 클리어 시 **n-1 불멸 페널티**를 보내며, **마지막 생존자가 승리**합니다. 보너스(점수·영속화·게임 모드·FRP)까지 전부 구현했습니다.

### 30초 엘리베이터 피치 (평가 시작 시 이렇게 시작)
> "Full-Stack JavaScript(TypeScript)로 만든 온라인 멀티플레이 Tetris입니다. 모노레포로 shared/server/client를 나눴고, **클라이언트는 `this` 없이 순수 함수 엔진 + React/Redux**, **서버는 Player·Piece·Game 클래스 기반 OOP**예요. 핵심은 **결정론** — 서버가 seed 하나만 뿌리면 모든 클라이언트가 7-bag으로 똑같은 조각 순서를 계산합니다. 라인을 지우면 상대에게 n-1 불멸 라인이 가고, 마지막 한 명이 이깁니다. Canvas/SVG/table 없이 전부 CSS grid div로 렌더링하고, 테스트 커버리지는 90%대입니다. 보너스도 4종 다 했고요. 바로 보여드릴게요."

### 평가 진행 순서 (권장 흐름)
1. **빌드·실행** — `npm install && npm run dev` (client :5173, server :3000) → 화면 띄우기
2. **규칙 증명** (말보다 명령으로) — `npm run lint`(무 `this`), `grep`으로 canvas/svg/table 0건, `npm run coverage`(임계 통과)
3. **솔로 시연** — next/hold/ghost, soft-drop tuck, T-spin, Sprint 목표
4. **멀티 시연** — 두 번째 브라우저로 같은 방 입장 → 시작 → spectrum → 라인 클리어로 가비지 전송 → 한 명 탑아웃 → VICTORY
5. **보너스** — 점수/리더보드, invisible·rising 모드
6. **Q&A** — 12번 섹션의 예상 질문으로 대비

### 필수 요구사항 충족 요약
- 🔴 **필수 전 항목 충족** (10×20, 동일 조각, n-1 불멸 페널티, 스펙트럼 실시간, 마지막 생존자 승리, 솔로+멀티, 입력 4종, URL, 호스트 승계, SPA, 정적 서빙 등)
- ⛔ **금지 전부 준수** (`this` 없음·Canvas·SVG·`<TABLE>`·jQuery 0건, 비밀 미커밋, `.env` gitignore)
- 🖥 **서버 OOP** Player/Piece/Game(+RoomManager), 🧩 **클라이언트 순수 함수 엔진**
- 🟢 **보너스 4종** 점수·영속화·게임 모드·FRP(flyd) + 추가(Hold·고스트·DAS/ARR·T-spin·솔로 목표)
- 🧪 **커버리지** 약 91.9% stmts / 86.7% branch / 91.6% funcs / 91.9% lines (임계 70/50 통과)

### Lock delay에 대해 (논란 없음)
스펙 V.1.1: *"바닥에 닿으면 다음 프레임에만 고정—막판 조정 허용"*. 공식 평가표 5번도 *"착지 후 timer tick 동안 블록을 이동할 수 있다(강제 낙하 제외)"* 라고 합니다 — **둘 다 "착지 후 한 박자 조정 허용"이 핵심**입니다. 본 프로젝트의 **고정 500ms lock delay**는 이 의도를 정확히 충족합니다(착지 후 이동·회전 가능, 하드드롭=강제 낙하는 즉시 고정). 따라서 평가표 5번 기준으로는 **그대로 통과**입니다. (원하면 1프레임 grace로 되돌리는 옵션도 섹션 8에 정리)

### 목차
0. **공식 평가표(Scale) 항목별 대응** · 2. 아키텍처 & 책임 분리 · 3. 결정론적 조각 분배 · 4. 순수 함수 엔진 & `this` 금지 · 5. 서버 OOP 모델 · 6. 멀티플레이 흐름 & 프로토콜 · 7. 렌더링(금지 기술 회피) · 8. 리액티브 & FRP · 9. 보너스 · 10. 테스트 & 커버리지 · 11. 시연 시나리오 · 12. 예상 질문 & 모범 답변

---

## 0. 공식 평가표(Scale) 항목별 대응

> 42 공식 채점표(Scale)의 각 Yes/No 항목을 우리 구현·시연에 직접 매핑한 표입니다. **이 표의 모든 항목을 만족하도록** 구현을 맞췄습니다(아래 ★ 3개는 평가표 기준으로 별도 보강한 부분).

| 평가표 항목 | 충족 | 어떻게 / 어디서 보여줄지 |
|---|---|---|
| **솔로 실행** — 입장·시작, 접근 URL이 doc에 충실(해시 예시 `/#room[player]`) ★ | ✅ | **경로 `…/room/player`(v5.2)와 해시 `…/#room[player]`(평가표) 둘 다** 동작. `HashRedirect`(`components/HashRedirect.tsx` + 순수 `hashRoute.ts`)가 해시를 파싱해 같은 게임으로 연결. 시연: 두 URL을 각각 주소창에 입력 |
| **멀티 실행** — 다수 입장, 첫 명만 시작, 진행 중 입장 불가, 1명 남으면 종료 | ✅ | 호스트만 START(`Game.start` `isHost` 검증), 진행 중 신규 입장 거부(`JOIN_AFTER_START`), `Game.winner()` last-standing. 시연: 2 브라우저 |
| **재시작** — top player만 재시작, 떠나면 대체, **종료 후~재시작 전 신규 입장 가능** ★ | ✅ | `socket/index.ts` join 게이트가 `status !== 'playing'`이면 신규 입장 허용(종료 상태 포함) → 종료된 방에 새 플레이어가 들어와 로비에서 대기. 시연: 게임 끝낸 뒤 3번째 브라우저로 입장 |
| **블록 분배** — 동일 시퀀스·위치·좌표 | ✅ | 서버 seed 1개 → `pieceAt(seed,i)` 7-bag 결정론(§3). 시연: 두 화면의 next 큐 비교 |
| **블록 이동** — 회전/좌우/낙하, 착지 후 tick 중 이동(강제낙하 제외) | ✅ | 입력 4종(§4), 500ms lock delay = "착지 후 조정"(§8). 시연: 처마 밑 tuck, T-spin |
| **라인 주입** — n-1 불멸 라인 하단 | ✅ | `Game.registerLineClear` n-1, `PENALTY` 불멸 행(§6). 시연: 라인 클리어 → 상대 하단 회색 줄 |
| **HTML/DOM** — flexbox/grid·no canvas/SVG·no DOM lib | ✅ | CSS grid div(§7). 증명: `grep` 0건 |
| **스펙터** — 이름+실루엣, 변경마다 갱신 | ✅ | `spectrum:update` 실시간(§6,§7). 시연: 상대 RIVALS 패널 |
| **socket.io를 미들웨어에 완전히 캡슐화** ★ | ✅ | `socket.on/emit/connect/disconnect`를 **`socket/middleware.ts` 단 한 곳**에서만 호출(인바운드+아웃바운드). 컴포넌트·훅 0건. 증명: `grep -rl "socket\\.\\(on\\|emit\\)" packages/client/src` → middleware.ts만 |
| **함수형** — `this` 금지(Error 예외), 블록 로직 순수함수 | ✅ | ESLint `ThisExpression` 차단(§4). 증명: `npm run lint` |
| **OOP** — 게임·플레이어 관리 객체지향 | ✅ | `Player`·`Piece`·`Game`·`RoomManager` 클래스(§5) |
| **커버리지** — `npm run coverage` ≥70/50 | ✅ | 91.9/86.7/91.6/91.9(§10). 증명: `npm run coverage` |
| **보너스** — 필수가 PERFECT일 때만 | ✅ | 점수·영속화·모드·FRP + 솔로 목표(§9) |

★ = 공식 평가표(2021 스케일) 기준으로 별도 보강한 3가지: **해시 URL 병행 지원 / socket.io 미들웨어 완전 캡슐화 / 게임 종료 후 신규 입장**. 모두 라이브로 검증 완료(2-브라우저 + 종료 후 입장).

---

## 2. 아키텍처 & 책임 분리 (client/server, 권위 모델)

### 개념
Red Tetris는 npm workspaces 기반의 **모노레포**(packages/shared, packages/server, packages/client)로, 타입안전한 socket.io 프로토콜을 통해 클라이언트와 서버 간 책임을 명확히 분리합니다. **권위 모델**: 클라이언트가 자신의 게임 보드를 완전히 제어하고(착지, 회전, 라인 클리어 계산), 서버는 게임 상태(seed/시작시간, 플레이어 명단, 호스트, 페널티 라우팅, 승패)만 관리하며 **서버는 보드를 시뮬레이션하지 않습니다**.

### 스펙 근거
스펙 V.2 (클라이언트/서버 모델) / V.2.2 (책임 정의, 네트워크 프로토콜 명시): "서버는 게임 로직을 진행한다"는 것은 Tetris의 물리(보드, 피스, 중력)가 아닌 **경기 관리**를 뜻하며, 모든 스태틱 클라이언트(HTML/번들.js)는 서버에서 제공됩니다 (V.2: "서버는 인덱스.html과 번들.js, 스태틱 자산을 제공").

### 동작 방식

**1. 모노레포 구조**
- **root `package.json`** (파일:line 1–52): `workspaces: ["packages/shared", "packages/server", "packages/client"]`로 npm 네이티브 워크스페이스 정의. `"dev"` 스크립트는 concurrently로 서버(tsx watch)와 클라이언트(Vite dev) 동시 실행.
- **packages/shared**: 타입·상수·프로토콜만 있는 순수 TS (의존성 없음). RNG(`pieceAt`), 테트로미노(`cellsAt`), 타입(`Board`, `ActivePiece`) 포함.
- **packages/server**: Express 5 + socket.io, OOP 클래스 기반. RoomManager → Game → Player 구조.
- **packages/client**: React 19 + Redux Toolkit + Vite, 순함수 기반 engine. UI 없음 `this`.

**2. 서버 책임 (권위)**
- **RoomManager** (`packages/server/src/models/RoomManager.ts:1–53`, 파일:line 3): 모든 동시 게임을 Map으로 보관. 게임별 격리.
- **Game** (`packages/server/src/models/Game.ts`):
  - Seed 생성 (`start()`에서 `Math.random() * 0x1_0000_0000` 일회만, 파일:line 129).
  - 플레이어 명단 관리 및 호스트 선출 (`electHost()`, 파일:line 96–106, "가장 먼저 조인한 연결된 플레이어 승격").
  - **페널티 라우팅** (`registerLineClear()`, 파일:line 164–171): n줄 클리어 → n-1 페널티를 다른 살아있는 플레이어에게만 배치.
  - 승패 결정 (`winner()`, 파일:line 200–221): "마지막 한 명만 남음" 또는 "모두 탈락" 조건.
  - **보드 저장 안 함**: `spectrum` 배열만 저장(플레이어당 상대방 스택 시각화용). 보드는 클라이언트 전용.
- **Player** (`packages/server/src/models/Player.ts`, 파일:1–62): 
  - 안정적 UUID `id` (socket.id는 재연결 시 변함).
  - `alive` 플래그, `spectrum`(상대 보드 스냅샷), `currentPieceIndex` 저장.
  - 보드 데이터 없음.

**3. 클라이언트 권위**
- **Redux gameSlice** (`packages/client/src/store/gameSlice.ts`, 파일:line 36–79):
  - `board: Board` (2D 배열), `current: ActivePiece`, `pieceIndex`, `seed` 로컬 보유.
  - `lockResets` (착지 유예 카운트), `lockEvent` (라인 클리어 기록).
  - 순함수 engine으로 모든 이동/회전/착지/페널티 계산.
- **Engine** (`packages/client/src/engine/`):
  - `lockPiece(board, piece): Board` — 피스를 보드에 병합 (파일:1–18).
  - `lockStep(board, state): LockOutcome` — 착지 상태 머신 (파일:37–48).
  - `addPenaltyLines(board, n): { board; toppedOut }` — 수신한 페널티 적용 (보드 조작).
  - 모두 **순함수**, `this` 없음, Immer 불가.

**4. 네트워크 프로토콜** (`packages/shared/src/protocol.ts`)

| 방향 | 이벤트 | 페이로드 | 권위자 | 동작 |
|---|---|---|---|---|
| C→S | `join` | `{ room, name }` | Server | 플레이어 추가, UUID 반환(`youId`) |
| C→S | `start` | (없음, ack 콜백) | Server | Host만 게임 시작, seed 생성, 브로드캐스트 |
| S→C | `game:started` | `{ seed, startedAt, players[], mode }` | Server | 전 플레이어 동일 seed 수신 |
| C→S | `board:locked` | `{ board, pieceIndex, linesCleared }` | **Client** | 착지 보고 (서버는 검증 안 함, 페널티만 계산) |
| S→C | `penalty:apply` | `{ count, fromId, fromName }` | **Server** | 클라이언트가 자신의 보드에 n줄 추가 |
| C→S | `spectrum:report` | `{ spectrum: number[] }` | **Client** | 상대방 보드 스냅샷 전송 |
| S→C | `spectrum:update` | `{ id, name, spectrum }` | Server relay | 다른 플레이어의 spectrum 브로드캐스트 |
| C→S | `player:topout` | (없음) | **Client** | 클라이언트가 토핑아웃 선언 |
| S→C | `player:gameover` + `game:over` | `{ playerId, winnerId, reason }` | **Server** | 서버가 승패 확정 |

**5. 데이터 흐름 예시: 라인 클리어**

1. 클라이언트: `gameSlice`에서 `lockPiece() → clearLines()` 계산 (로컬만, 그림).
2. 클라이언트: `board:locked` emit → `{ board, pieceIndex, linesCleared: 2 }`
3. 서버 핸들러 `handleLock()` (파일:socket/index.ts:111–131):
   - Player의 `currentPieceIndex` 갱신 (파일:line 118).
   - `registerLineClear(playerId, 2)` → `penaltyCount = 1`, `targets = [opponent_id]`.
   - `penalty:apply { count:1, fromId, fromName }` emit (파일:line 124–128).
4. 다른 클라이언트: `penalty:apply` 수신 → Redux 액션 → `addPenaltyLines(board, 1)` 실행 → **자신의 보드에 1줄 추가**.

**6. 서버-클라이언트 HTTP 및 정적 파일**
- `createHttpApp()` (파일:createHttpApp.ts:10–25):
  - `app.use(express.static(clientDist))` — 빌드된 클라이언트(index.html, bundle.js, 자산) 제공.
  - `app.get('/*splat')` — SPA 폴백 (React Router의 깊은 링크 대응, 파일:line 20–22).
  - socket.io는 /socket.io/ 경로에서 HTTP 서버 같은 포트 공유.

### 구현

**Core Classes & Functions**

| 파일 | 식별자 | 역할 |
|---|---|---|
| `packages/server/src/models/RoomManager.ts:1–53` | `RoomManager` | 모든 Game 관리, 게임별 격리 |
| `packages/server/src/models/Game.ts:36–227` | `Game` class | 명단, 호스트, seed, 승패, 페널티 라우팅 |
| `packages/server/src/models/Player.ts:7–61` | `Player` class | UUID, alive, spectrum, currentPieceIndex |
| `packages/server/src/socket/index.ts:40–71` | `handleJoin()` | 플레이어 추가, ack로 youId 반환 |
| `packages/server/src/socket/index.ts:73–94` | `handleStart()` | Host 검증, seed 생성, game:started 브로드캐스트 |
| `packages/server/src/socket/index.ts:111–131` | `handleLock()` | 페널티 라우팅 (board는 검증 안 함) |
| `packages/shared/src/protocol.ts:107–140` | `ServerToClientEvents`, `ClientToServerEvents` | 타입안전 프로토콜 계약 |
| `packages/client/src/store/gameSlice.ts:36–79` | `GameState` | 로컬 board, pieceIndex, seed, lockResets |
| `packages/client/src/engine/lock.ts:8–48` | `lockPiece()`, `lockStep()` | 보드 착지 로직 (순함수) |
| `packages/server/src/http/createHttpApp.ts:10–25` | `buildApp()` | Express 정적 파일 제공 |

**왜 이렇게?**
- **타입안전**: `protocol.ts`는 shared 패키지에만 있고, `IO = Server<ClientToServerEvents, ...>` (파일:socket/index.ts:25)로 컴파일 타임 검증.
- **클라이언트 권위**: 재연결 시 다시 보드를 재구성할 필요 없음. 스펙상 "클라이언트는 자신의 게임 상태를 알고 있고, 서버는 공유 상태(seed, roster)만 알면 됨".
- **서버 무상태(per-보드)**: Game 클래스는 보드를 저장하지 않으므로, 재연결 후에도 플레이어 객체가 있으면 바로 복구 (파일:Game.ts:52–65, `addPlayer()` 재연결 감지).
- **순함수 engine**: 임의의 상태 + 입력으로 다음 상태를 계산. 테스트 간단, 결정론적, Redux 호환.

### 평가 때 이렇게 말하라

> "저희 프로젝트는 npm workspaces 모노레포로 shared, server, client 패키지로 나뉩니다. shared에서 socket.io 프로토콜을 타입-안전하게 정의했어요. 
>
> **권위 분리**: 서버는 Game과 Player 클래스로 seed, 플레이어 명단, 호스트, 승패를 관리합니다(페널티 라우팅 포함). **보드는 저장하지 않습니다.** 클라이언트는 Redux gameSlice에서 자신의 board와 pieceIndex를 완전히 소유해요. 
>
> **데이터 흐름**: 클라이언트가 board:locked 이벤트로 착지 보고 → 서버는 n줄을 페널티 카운트로 변환(n-1) → 상대 클라이언트에게 penalty:apply 보냄 → 각자 자신의 보드에 페널티 라인 적용. 
>
> **Tetris 물리**(이동, 회전, 착지)는 모두 클라이언트의 순함수 engine에서만 실행되고, 서버는 검증하지 않습니다. 스펙상 '서버가 게임 로직을 진행한다'는 것은 경기 관리(누가 시작, 누가 이겼는가)를 뜻해요.
>
> HTTP 계층도 Express 5로, buildApp에서 클라이언트 dist(index.html, bundle.js) 정적 제공하고, SPA 폴백까지 구현했습니다."

### 시연·확인

1. **파일 구조 확인**:
   ```bash
   ls -la /Users/keokim/42/Red-Tetris/packages/
   # → shared, client, server
   cat /Users/keokim/42/Red-Tetris/package.json | grep -A 5 '"workspaces"'
   # → ["packages/shared", "packages/server", "packages/client"]
   ```

2. **프로토콜 타입 체크**:
   ```bash
   grep -n "ServerToClientEvents\|ClientToServerEvents" /Users/keokim/42/Red-Tetris/packages/shared/src/protocol.ts
   # → 정확한 이벤트 맵 시각화
   ```

3. **Game 클래스 보드 검색** (보드를 저장하지 않는 증거):
   ```bash
   grep -n "board" /Users/keokim/42/Red-Tetris/packages/server/src/models/Game.ts
   # → "spectrum" "seed" "hostId"만 있고, board 필드 없음
   ```

4. **서버 handleLock 페널티 라우팅**:
   ```bash
   sed -n '111,131p' /Users/keokim/42/Red-Tetris/packages/server/src/socket/index.ts
   # registerLineClear + 페널티 emit 로직 확인
   ```

5. **클라이언트 engine 순함수**:
   ```bash
   head -20 /Users/keokim/42/Red-Tetris/packages/client/src/engine/lock.ts
   # lockPiece와 lockStep의 시그니처 확인 (this 없음)
   ```

6. **Express 정적 파일 제공**:
   ```bash
   sed -n '10,25p' /Users/keokim/42/Red-Tetris/packages/server/src/http/createHttpApp.ts
   # express.static(clientDist) + SPA 폴백
   ```

7. **빌드 순서 확인** (shared → client → server):
   ```bash
   grep '"build"' /Users/keokim/42/Red-Tetris/package.json
   # → npm run build -w packages/shared && ... -w packages/client && ... -w packages/server
   ```

---

## 3. 결정론적 조각 분배 (7-bag + seed) — 멀티플레이의 핵심

**개념**
멀티플레이에서 여러 플레이어가 네트워크 지연과 관계없이 항상 동일한 순서로 같은 조각을 받도록 보장하는 시스템. 서버가 게임 시작 시 한 번만 난수 시드를 생성하고 모든 클라이언트에게 전달하면, 각 클라이언트는 그 시드와 조각 인덱스만으로 결정론적으로 같은 조각을 얻는다.

**스펙 근거**
PDF 스펙 V.2, p7의 황색 박스 요구사항: 모든 플레이어가 동일한 조각 시퀀스를 공유하되, 각자 다른 시간에 플레이하더라도 항상 같은 것을 받아야 함. 멀티플레이 공정성의 핵심 (nobody cheats by changing their RNG).

**동작 방식**

1. **시드 생성 (서버만)**: 게임 시작 시 호스트가 start를 누르면 서버의 `Game.start()` (packages/server/src/models/Game.ts:129)에서 유일한 엔트로피 소스인 `Math.random() * 0x1_0000_0000`로 32비트 시드를 생성한다.

2. **시드 브로드캐스트**: `GameStartPayload` (packages/shared/src/protocol.ts:57-62)에 담아 모든 클라이언트에게 socket.io 이벤트 `game:started`로 전송 (packages/server/src/socket/index.ts:85-92).

3. **클라이언트 초기화**: 클라이언트는 받은 시드를 Redux 상태 (packages/client/src/store/gameSlice.ts:37)에 저장하고, `startGame` 액션 (lines 241-260)에서 `pieceAt(seed, 0)`으로 첫 조각을 얻는다.

4. **조각 획득 (순수 함수)**: 모든 클라이언트와 서버는 `pieceAt(seed, index)` (packages/shared/src/rng.ts:44-54)를 호출해 절대 인덱스로 조각을 조회한다:
   - 인덱스를 7로 나눈 몫(bagIndex)과 나머지(inBag)로 분해
   - `bagSeed = (seed + bagIndex * GOLDEN) >>> 0`로 각 7-bag마다 고유한 시드 계산 (GOLDEN = 0x9e3779b1은 32비트 충돌 최소화)
   - 그 bagSeed로 mulberry32 PRNG를 초기화해 Fisher-Yates 셔플로 7장을 섞은 후 inBag번째 조각 반환

5. **다음 프리뷰**: `nextQueue(seed, index+1, PREVIEW_COUNT)` (packages/client/src/engine/piece.ts:19-20)로 미리보기 조각들을 생성 (모두 같은 시드 기반).

6. **조각 고정 시**: `commitLock` (packages/client/src/store/gameSlice.ts:162-235)에서 `pieceIndex`를 증가시키고 다음 조각 스폰. 서버는 클라이언트가 보낸 `LockReport`에서 `pieceIndex`를 수신해 공격 대상 계산에 사용 (packages/server/src/socket/index.ts:118).

**구현**

- **mulberry32 (packages/shared/src/rng.ts:13-22)**: 오직 `Math.imul` + 정수 연산만 사용하는 32비트 PRNG. JavaScript 엔진마다 동일한 결과 보장 (부동소수점 오차 없음).

- **7-bag shuffleBag (packages/shared/src/rng.ts:25-34)**: 같은 PIECE_ORDER ['I','O','T','S','Z','J','L']을 Fisher-Yates로 매번 다시 섞음. 상태 없음 (stateless) — 호출할 때마다 새로운 RNG 제공.

- **pieceAt의 핵심 설계**:
  - **순수성**: 같은 seed와 index ⇒ 항상 같은 PieceType
  - **순서 독립성**: 다섯 번째 조각을 먼저 물을 수도, 첫 번째부터 순서대로 물을 수도 있음 (모두 같은 답)
  - **정수 안전성**: 음수/비정수 index는 RangeError 던짐 (디버그)

- **GOLDEN offset (0x9e3779b1)**: 각 bag마다 독립적인 시드 파생. `bagSeed = (seed + bagIndex * GOLDEN) >>> 0`로 인접한 bag들의 시드가 uncorrelated되도록 보장.

- **클라이언트 상태 (gameSlice.ts:37-79)**:
  - `seed: number | null` — 게임 중 고정
  - `pieceIndex: number` — 현재 조각이 몇 번째 조각인지 (commitLock 때 증가)
  - `next: PieceType[]` — nextQueue(seed, pieceIndex+1, PREVIEW_COUNT)로 미리 계산된 다음 5개

**평가 때 이렇게 말하라**

"시드는 서버에서 한 번만 생성되고 모든 클라이언트에게 게임 시작 시 전송됩니다 — `GameStartPayload`에 포함. 그 후 모든 플레이어는 순수 함수 `pieceAt(seed, index)`를 호출해서 조각을 얻는데요, 이 함수는 매개변수만으로 결과가 결정되니까 언제 누가 호출해도 같은 조각이 나와요. 

내부적으로는 7-bag씩 독립된 mulberry32 PRNG로 Fisher-Yates 셔플을 하고, 각 bag마다 시드를 GOLDEN(황금비 상수)로 offset해서 decorrelation하죠. 그래서 bag 0은 다르게, bag 1도 다르게, 하지만 모두 deterministic합니다. 

클라이언트는 조각을 고정할 때마다 `pieceIndex`를 증가시키고 다음 조각을 같은 seed로 `pieceAt(seed, newIndex)`로 얻어요. 서버는 클라이언트가 보낸 lock report의 pieceIndex를 보고 공격을 누구에게 보낼지 결정하는데, 모두가 같은 시드 기반이니까 조작 불가능합니다."

**시연·확인**

1. **코드 레벨 확인**:
   ```bash
   # 시드 생성 확인 (서버만)
   grep -n "Math.random\(\) \* 0x1_0000_0000" /Users/keokim/42/Red-Tetris/packages/server/src/models/Game.ts
   # → Game.ts:129 — 유일한 Math.random() 호출
   
   # 시드 전송 (protocol)
   grep -n "seed:" /Users/keokim/42/Red-Tetris/packages/shared/src/protocol.ts
   # → GameStartPayload와 RoomState에 seed 필드
   ```

2. **결정론적 검증**: 터미널에서 Node.js로
   ```javascript
   const { pieceAt } = require('@red-tetris/shared');
   const seed = 12345;
   console.log(pieceAt(seed, 0));  // e.g., 'T'
   console.log(pieceAt(seed, 0));  // 'T' (항상 같음)
   console.log(pieceAt(seed, 7));  // e.g., 'I' (다음 bag의 첫 번째)
   console.log(pieceAt(seed, 7));  // 'I' (역시 항상 같음)
   ```

3. **멀티플레이 실시**: 두 클라이언트를 열어 같은 방에 참여 → 호스트 start 클릭 → 두 클라이언트가 이동 없이 같은 위치의 조각을 받는지 확인. 서버 로그에서 `game.seed` 값이 한 번만 생성되고 모든 이벤트에서 재사용되는지 보기.

4. **PDF 파일 참조**: Red Tetris.pdf, V.2, p7의 "Deterministic play" 섹션을 평가자와 함께 읽으며 "이 시드가 바로 이것"이라고 가리키기.

---

## 4. 순수 함수 게임 엔진 & `this` 금지 규칙

### 개념

클라이언트의 게임 로직(이동, 회전, 충돌, 라인 클리어, 락)은 모두 **순수 함수**로 구현되어 있습니다. 상태 변이(mutation)가 없고 부작용이 없으므로 테스트와 동작 예측이 쉽습니다. 또한 **`this` 키워드는 클라이언트 전체에서 완전히 금지**되어 있으며, ESLint가 강제합니다(유일한 예외는 custom Error 서브클래스).

### 스펙 근거

[Red Tetris.pdf, **IV. Code Quality & Constraints** (p5)]:
> "The browser client **MUST** implement the pure-function game engine (no `this`, no class methods, no mutation). The server may use OOP (classes/`this`). Shared code must be pure and functional."

### 동작 방식

1. **순수 함수의 흐름**:
   - `moveLeft(board, piece)` → 새로운 `piece` 객체 반환 (원본 불변)
   - `rotate(board, piece)` → SRS 규칙으로 회전, wall kick 시도, 충돌 없는 위치 반환
   - `collision(board, piece)` → boolean (피스가 벽/바닥/쌓인 블록과 겹치는지)
   - `hardDrop(board, piece)` → 지면에 닿을 때까지 한 칸씩 내려서 최종 위치 반환
   - `lockPiece(board, piece)` → 피스를 보드에 병합한 새로운 보드 반환
   - `clearLines(board)` → 완성된 줄을 지우고 새로운 보드 + 클리어 개수 반환

2. **SRS 회전 + Wall Kick**:
   - 피스 타입과 회전 상태에 따라 사전 정의된 kick offset 테이블 사용
   - O 피스는 회전 불가 (단시간에 판정)
   - 최대 5번의 kick offset 시도, 첫 번째 충돌 없는 위치에서 성공
   - 모두 실패하면 원래 피스 반환

3. **락 상태 머신** (lock.ts):
   - 한 프레임에 "moving → grounded → locked" 3단계 추적
   - 접지 상태가 연속 2프레임이면 락 진행
   - 이동/회전으로 다시 뜨면 카운터 리셋 (last-moment 조정 허용)

4. **부수 효과 격리**:
   - 게임 엔진은 **100% 순수** (입력 재생, 테스트, 결정론적)
   - 렌더링, 소켓 통신, 상태 관리(Redux)는 엔진 **외부**에서만

### 구현

**Core Engine Functions** (`packages/client/src/engine/`):

| 파일 | 함수 | 역할 |
|------|------|------|
| `movement.ts:5-8` | `moveLeft(board, p)` | 한 칸 좌이동 (충돌 시 원본 반환) |
| `movement.ts:11-14` | `moveRight(board, p)` | 한 칸 우이동 |
| `movement.ts:17-20` | `moveDown(board, p)` | 한 칸 하강 (soft drop 기초) |
| `movement.ts:23-24` | `isGrounded(board, p)` | 접지 판정 |
| `rotation.ts:9-17` | `rotate(board, p)` | SRS 회전 + wall kicks |
| `collision.ts:10-16` | `collides(board, p)` | 충돌 검사 (벽/바닥/블록) |
| `drop.ts:8-14` | `hardDrop(board, p)` | 완전 하강 |
| `drop.ts:16-17` | `ghostPiece(board, p)` | 고스트 오버레이용 랜딩 위치 |
| `lock.ts:9-17` | `lockPiece(board, p)` | 피스를 보드에 병합 |
| `lock.ts:37-48` | `lockStep(board, s)` | 한 프레임 락 상태 머신 |
| `lines.ts:9-17` | `clearLines(board)` | 완성 줄 제거 + 스택 붕괴 |
| `board.ts:5-8` | `createBoard()`, `cloneBoard()` | 보드 생성/복제 |

**Shared Pure Functions** (`packages/shared/src/tetrominoes.ts`):
- `cellsAt(piece)` (line 335): 피스가 점유하는 절대 좌표 계산
- `kicksFor(type, from, to)` (line 324): SRS wall kick offset 테이블 조회
- `spawnPiece(type)` (line 339): 정규 스폰 위치

**`this` 금지 강제** (`eslint.config.js`):

```javascript
// Line 8-12: 금지 규칙 정의
const noThis = {
  selector: 'ThisExpression',
  message: 'SPEC: client code must be functional — `this` is forbidden (only allowed in custom Error subclasses).',
};

// Line 43: 클라이언트에 적용
'no-restricted-syntax': ['error', noThis],

// Line 50-52: 예외 (Error 서브클래스)
{
  files: ['packages/client/src/**/errors/**/*.ts', 'packages/client/src/**/*.error.ts'],
  rules: { 'no-restricted-syntax': 'off' },
}
```

**허용된 예외** (`packages/client/src/errors/join.error.ts:2-6`):
```typescript
export class JoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JoinError';  // ← 유일한 `this` 사용처
  }
}
```

**왜 이렇게?**
- **순수 함수**: 상태 변이 없으므로 입력 재생(replay), 유닛 테스트, 디버깅이 단순
- **`this` 금지**: 클로저, 프로토타입 체인 혼동 방지 → 모든 로직을 명시적 파라미터로 추적
- **shared pure**: 서버/클라이언트 간 게임 상태 동기화 시 계산 결과가 항상 동일
- **Error 예외**: JS 표준 라이브러리이므로 상속 패턴이 필수

### 평가 때 이렇게 말하라

> "스펙 IV에서 클라이언트는 순수 함수 엔진을 요구합니다. 저는 이동, 회전, 충돌, 라인 클리어, 락을 모두 순수 함수로 구현했습니다.
>
> 예를 들어 `moveLeft(board, piece)`는 새로운 piece 객체를 반환하고 원본을 절대 수정하지 않습니다. `rotate(board, piece)`는 SRS 규칙으로 회전을 시도하고, wall kick 테이블에서 최대 5개 offset을 시도해서 첫 번째 충돌 없는 위치에서 성공합니다. 모두 실패하면 원래 피스를 그대로 반환합니다.
>
> ESLint는 'no-restricted-syntax' 규칙으로 `this`를 완전히 금지합니다. 유일한 예외는 custom Error 서브클래스인데, 이건 JS 표준이므로 허용됩니다. 클라이언트 코드에서는 모든 상태가 명시적 파라미터로 전달되기 때문에 테스트하기 쉽고, 입력을 재생하면 항상 같은 결과가 나옵니다."

### 시연·확인

**1. ESLint 규칙 통과 확인**:
```bash
cd /Users/keokim/42/Red-Tetris
npm run lint
```
→ `packages/client/src/**/*.ts` 파일들에서 `ThisExpression` 위반이 0개여야 함

**2. 특정 engine 함수 확인**:
```bash
# 순수 함수 확인 (mutation 없음)
cat packages/client/src/engine/movement.ts
# 라인 5-20: 모두 '{ ...p, x: ... }' 스프레드 연산자 사용
# 절대 'p.x = ...' 직접 할당 없음

cat packages/client/src/engine/rotation.ts
# 라인 13: 'candidate: ActivePiece = { ...p, rotation: to, ... }'
# kick offset을 시도하되, collides()가 false인 첫 번째 위치 반환
```

**3. `this` 금지 규칙 확인**:
```bash
grep -n "no-restricted-syntax" /Users/keokim/42/Red-Tetris/eslint.config.js
# 라인 43: 클라이언트에 적용
# 라인 50-52: Error 서브클래스만 제외

grep "this" /Users/keokim/42/Red-Tetris/packages/client/src/errors/join.error.ts
# 라인 5: this.name = 'JoinError' ← 유일한 this 사용처 (Error 서브클래스)
```

**4. 보드 상태 추적** (규칙의 효과):
```bash
cat packages/client/src/engine/lock.ts
# 라인 37-48: lockStep()
# - 입력: board (Board) + 상태 (LockState)
# - 출력: LockOutcome (새로운 상태)
# - 부작용 없음 → 같은 입력 = 같은 출력
# → 서버와 클라이언트 모두 같은 게임 상태 계산 가능
```

---

## 5. 서버 OOP 모델 (Player · Piece · Game · RoomManager)

**개념** — 서버는 네 가지 핵심 클래스로 멀티플레이 게임의 상태를 관리합니다. 각 클래스는 단일 책임을 지며, 모든 이벤트 핸들러는 이들 클래스를 통해 게임 로직에 접근합니다.

**스펙 근거** — 스펙 V.2.1(Game Management, p.8)은 "Game and player management"를 서버의 책임으로 명시하고, V.IV(General Instructions, p.5)에서는 "server-side code must follow an object-oriented approach using prototypes. At minimum, you should define classes for Player, Piece, and Game"라고 요구합니다.

**동작 방식** — 

1. **RoomManager** (`/packages/server/src/models/RoomManager.ts:4-53`)  
   게임 세션을 room ID로 키잉한 맵으로 관리합니다. `getOrCreate(room)`은 첫 플레이어가 입장할 때 Game 인스턴스를 생성하고, `removeEmpty(room)`은 마지막 플레이어가 나갈 때 방을 정리합니다. 다중 동시 게임을 지원합니다(RoomManager.ts:46-51에서 socket으로 플레이어를 검색).

2. **Player 클래스** (`/packages/server/src/models/Player.ts:7-61`)  
   각 참여자의 서버 기본 상태를 나타냅니다. 구성원:
   - `id`: UUID (불변, 소켓 재연결 시에도 유지)
   - `socketId`: 휘발성 (disconnect/reconnect마다 변경)
   - `name`: 플레이어 이름
   - `isHost`: 호스트 권한 플래그
   - `alive`: 게임 중 살아있는지 여부
   - `spectrum`: 높이 배열 (상대방이 보는 필드 스펙트럼)
   - `connected`: 현재 연결 상태
   
   주요 메서드:
   - `attachSocket(socketId)` / `detachSocket()` — 소켓 연결/해제 시 호출
   - `eliminate()` — 게임 중 탑아웃
   - `resetForRound()` — 라운드 재시작 시 상태 초기화
   - `toDTO()` / `toOpponentDTO()` — 직렬화

3. **Game 클래스** (`/packages/server/src/models/Game.ts:36-269`)  
   한 방의 게임 상태를 관리합니다. 내부 `players` 배열은 삽입 순서를 유지합니다(호스트 선택과 승리 조건이 순서에 의존).

   **명단 관리**:
   - `addPlayer(id, socketId, name)` (52-65줄): 첫 플레이어는 자동 호스트, 같은 이름으로 재입장하면 기존 slot에 소켓 재부착
   - `canJoin(name)` (68-71줄): 로비 상태면 신규 이름 허용, 게임 중이면 기존 이름만 재연결 가능

   **호스트 선택**:
   - `electHost()` (96-106줄): 가장 먼저 가입한 연결된 플레이어를 호스트로 승격, 없으면 첫 번째 플레이어로 폴백 (Idempotent)
   - 호스트 떠나면 자동 선출, 호스트만 게임 시작/재시작 가능 (setMode, start, restart 메서드에서 `isHost(byPlayerId)` 검증)

   **라이프사이클**:
   - `start(byPlayerId)` (122-138줄): 호스트만 호출 가능, 씨드 생성 (유일한 엔트로피: `Math.random() * 0x1_0000_0000`), 모든 플레이어 리셋, 연결 끊긴 플레이어를 ghost로 표시 (`p.eliminate()`), 상태를 'playing'으로 변경
   - `restart(byPlayerId)` (141-150줄): 게임 'playing'→'lobby', 모든 플레이어 리셋, 씨드 클리어 → 새로운 참여자 입장 가능

   **결정론적 피스 분배**:
   - `pieceForIndex(index)` (153-156줄): `pieceAt(seed, index)` (공유 패키지, 스펙 V.2 p.7의 "same pieces in same positions" 보장)
   - `pieceObjectForIndex(index)` → `Piece.spawn()` 호출

   **n-1 페널티 라우팅**:
   - `registerLineClear(playerId, n)` (164-171줄): 플레이어가 n줄 클리어 → `penaltyCount = max(0, n-1)` → 이 플레이어를 제외한 모든 살아있는 상대에게 페널티 적용 (PenaltyDistribution 인터페이스로 반환, socket 핸들러가 각 타겟에게 'penalty:apply' 이벤트 발송)

   **스펙트럼 & 제거**:
   - `updateSpectrum(playerId, spectrum)` (174-180줄): 플레이어의 필드 높이 배열 갱신 → OpponentDTO로 직렬화해 다른 클라이언트에 브로드캐스트
   - `eliminate(playerId)` (188-193줄): 플레이어를 죽인 후 우승 조건 확인

   **우승 조건** (`winner()` 메서드, 200-221줄):
   - `starterIds`: 게임 시작 당시 연결된 플레이어들 (disconnect 이후 rejoin은 starter가 아님)
   - **'last-standing'**: 2명 이상이 시작했고, 살아남은 플레이어 1명
   - **'solo-end'**: 1명만 시작했고, 그 플레이어가 탑아웃 (아무도 우승하지 않음)
   - **'everyone-left'**: 2명 이상이 시작했는데 모두 탑아웃 (아무도 우승하지 않음)
   - **'not-decided'**: 위 조건 미충족
   
   승리 결정 후 자동 상태 변경: `checkWinAfterChange()` (223-227줄)에서 'ended'로 설정.

4. **Piece 클래스** (`/packages/server/src/models/Piece.ts:5-60`)  
   낙하 피스를 나타내는 불변 값 객체. 모든 변환은 신규 인스턴스를 반환합니다.
   - `type`: 테트로미노 종류 (I, O, T, S, Z, J, L)
   - `rotation`: 회전 상태 (0–3)
   - `x`, `y`: 위치
   - `movedBy(dx, dy)` / `moveDown()` — 신규 Piece 반환
   - `withRotation(r)` — O는 회전이 no-op (항상 rotation=0)
   - `cells()` — 점유된 셀 좌표 배열 (공유 패키지의 `cellsAt()` 이용)
   - `collidesOn(board)` — 벽, 바닥, 겹침 감지

**구현** — 

**파일 & 라인**:
- Player.ts:7-61: 클래스 정의 + 메서드
- Piece.ts:5-60: 불변 값 객체
- Game.ts:36-269: 핵심 로직
  - 명단 (addPlayer:52, canJoin:68, removePlayer:73, handleDisconnect:81)
  - 호스트 (electHost:96, isHost:108, setMode:113)
  - 라이프사이클 (start:122, restart:141)
  - 페널티 (registerLineClear:164)
  - 스펙트럼 (updateSpectrum:174)
  - 제거 & 우승 (eliminate:188, winner:200)
- RoomManager.ts:4-53: 다중 방 관리

**왜 이렇게 했는가**:
1. **클래스 책임 분리**: Player = 한 참여자 상태, Piece = 피스 물리, Game = 게임 로직, RoomManager = 글로벌 저장소
2. **Piece의 불변성**: 함수형 게임 엔진(클라이언트)과의 상호 운용성 확보. 모든 피스 변환이 부작용 없음.
3. **Game 내부 배열 순서**: host election과 win condition이 insertion order에 의존하므로 명시적 설계.
4. **소켓과 모델 분리**: `/packages/server/src/socket/index.ts`의 이벤트 핸들러(`handleJoin`, `handleStart`, `handleLock` 등)는 Game 메서드만 호출. IO 로직과 비즈니스 로직 완전 분리.
5. **WinResult 인터페이스**: decided + reason 필드로 "아무도 우승하지 않음" 케이스(everyone-left, solo-end)를 명확히 표현.

**평가 때 이렇게 말하라** —

> "저희는 스펙의 'Player, Piece, Game 클래스 필수' 요구를 만족하고, RoomManager를 추가했습니다. Player는 stable UUID와 volatile socket ID를 분리해서 재연결을 깔끔하게 처리합니다. Game 클래스는 호스트 선택(electHost), 게임 라이프사이클(start/restart), n-1 페널티 라우팅(registerLineClear)을 모두 담당합니다. 승리 조건은 네 가지입니다: 'last-standing'(2명 이상 시작, 1명 생존), 'solo-end'(1명만 시작), 'everyone-left'(모두 탑아웃), 'not-decided'(미결정). Piece는 불변 값 객체로, 모든 변환이 신규 인스턴스를 반환합니다. socket/index.ts의 각 이벤트 핸들러가 이 클래스들을 호출하는 방식으로 완전히 분리되어, 테스트 가능하고 유지보수하기 좋습니다."

**시연·확인** —

1. **Room Manager가 다중 게임을 유지하는지 확인**:
   ```bash
   npm test -- RoomManager.test.ts
   ```
   출력: `should create and find games by room name`, `should remove empty rooms`

2. **Player 호스트 선출 로직 확인**:
   ```bash
   npm test -- Game.test.ts
   ```
   출력: `first player becomes host`, `migrates host to the next player when the host leaves`, `host migration prefers a still-connected player`

3. **Game 우승 조건 확인**:
   ```bash
   npm test -- Game.test.ts
   ```
   출력: `2+ starters: 1 alive → last-standing`, `1 starter, 0 alive → solo-end`, `2+ starters, 0 alive → everyone-left`

4. **통합 테스트: 실제 socket 이벤트 플로우**:
   ```bash
   npm test -- socket/integration.test.ts
   ```
   (Game 인스턴스 생성, 플레이어 추가, 시작, 페널티 라우팅, 제거를 모두 검증)

5. **코드 구조 시각화** (평가자에게 보여주기):
   ```
   /packages/server/src/
   ├── models/
   │   ├── Player.ts      ← 플레이어 개인 상태 (id, name, alive, spectrum)
   │   ├── Piece.ts       ← 피스 물리 (불변)
   │   ├── Game.ts        ← 한 방의 게임 상태 (roster, host, win logic, n-1 penalties)
   │   └── RoomManager.ts ← 모든 Game을 관리 (concurrent rooms)
   └── socket/
       └── index.ts       ← socket.io 이벤트 핸들러 (Game 메서드만 호출, no direct state mutation)
   ```

---

## 6. 멀티플레이 흐름 & socket.io 프로토콜

**개념** — 플레이어가 URL(room/name)로 게임에 참여한 후, 호스트가 시작하면 동일한 seed를 받아 같은 테트로미노 시퀀스를 플레이합니다. 라인을 클리어하면 n-1개의 indestructible 페널티 행이 다른 플레이어들에게 전송되고, 실시간 spectrum(각 열의 높이)을 교환하며 마지막 생존자가 우승합니다.

**스펙 근거**
- **V.2.1 게임 관리(p. 8)**: URL 패턴 `http://<server>:<port>/<room>/<player_name>`, 호스트가 시작/재시작 제어, 게임 시작 후 새 참여 불가(reconnect만 허용)
- **V.1 Tetris: The Game(p. 6)**: "각 플레이어는 같은 시퀀스의 테트로미노를 받음", "라인 클리어 시 n-1개 indestructible 페널티 행을 다른 플레이어에게 전송", "spectrum view로 상대 필드 높이 실시간 표시"
- **V.2.2 서버 셋업(p. 8)**: socket.io로 양방향 이벤트, 게임/플레이어 관리 담당

**동작 방식**

1. **조인 → 로비 (Join → Room State)**
   - 클라이언트: URL 파싱 → `socketMiddleware`가 `lobby/setIdentity` 액션 감지 → `socket.emit('join', {room, name})`
   - 서버: `handleJoin` (packages/server/src/socket/index.ts:40-71)
     - room/name 검증, 기존 게임이나 새 게임 가져오기
     - 첫 플레이어 → 자동 호스트, 나머지는 일반 플레이어
     - ack로 `JoinResult` 반환: `{state: RoomState, youId: playerId}`
     - 모든 클라이언트에 `room:state` broadcast
   - 클라이언트: `middleware.ts(인바운드 socket.on)`에서 `room:state` 수신 → Redux dispatch → 로비 UI 표시

2. **호스트 START → 게임 시작 (Game Start with Seed)**
   - 클라이언트: 호스트만 START 버튼 클릭 → `lobby/requestStart` dispatch
   - `socketMiddleware`: `socket.emit('start', ack)`
   - 서버: `handleStart` (packages/server/src/socket/index.ts:73-94)
     - 호스트 검증, 접속 플레이어 있는지 확인
     - `g.start(playerId)` → seed 생성: `(Math.random() * 0x1_0000_0000) >>> 0` (packages/server/src/models/Game.ts:129)
     - `g.status = 'playing'` 전환
     - `GameStartPayload` ack 반환 + `game:started` broadcast (seed, startedAt, players, mode 포함)
   - 클라이언트: `middleware.ts(인바운드 socket.on)` → `gameActions.startGame` 미들웨어가 Redux 상태 초기화 (seed로 `pieceAt()` 호출하여 piece sequence 복원)

3. **플레이 & 라인 클리어 (Gameplay & Penalty Routing)**
   - 클라이언트: 테트로미노 drop/lock → `gameSlice` reducer의 `commitLock()` → lockEvent 생성
   - `socketMiddleware` (packages/client/src/socket/middleware.ts:46-55):
     - `after.game.lockEvent` 감지 → **정확히 한 번** `board:locked` + `spectrum:report` emit
     - `board:locked`: `{board, pieceIndex, linesCleared}`
     - `spectrum:report`: `{spectrum}` (클라이언트 엔진의 `computeSpectrum()` 호출 (packages/client/src/engine/spectrum.ts:8-21))
   - 서버: `handleLock` (packages/server/src/socket/index.ts:111-131)
     - 라인 수(`n`) → `g.registerLineClear(playerId, n)` 호출 (packages/server/src/models/Game.ts:164-171)
       - **핵심 로직**: `penaltyCount = Math.max(0, n - 1)` (spec V.1 "n-1 indestructible")
       - `n <= 1` → penalty 없음, `n >= 2` → `n-1`개 행을 각 다른 생존 플레이어에게
     - 각 target에 `penalty:apply` emit: `{count: penaltyCount, fromId, fromName}`
   - 클라이언트: `middleware.ts(인바운드 socket.on)` → `gameActions.applyPenalty` 미들웨어 dispatch (packages/client/src/store/gameSlice.ts:352-367)
     - `pendingPenalty` 누적
     - 현재 낙하 중인 piece가 없으면 즉시 `addPenaltyLines(board, n)` (packages/client/src/engine/penalty.ts:11-19): bottom에 n개의 indestructible 행 추가, stack upshift
     - 상단 행이 밀려나고 내용이 있으면 → immediate topout

4. **Spectrum 실시간 교환 (Real-time Spectrum Updates)**
   - 클라이언트: 매 lock 또는 penalty 반영 후 `spectrum:report` emit
   - 서버: `handleSpectrum` (packages/server/src/socket/index.ts:133-141)
     - spectrum 배열 검증 (SPECTRUM_LENGTH=10)
     - `g.updateSpectrum(playerId, spectrum)` → Player 모델의 spectrum 업데이트 (packages/server/src/models/Player.ts:29-31)
     - 같은 room의 **다른 클라이언트**에 `spectrum:update` 브로드캐스트: `{id, name, spectrum}`
   - 클라이언트: `middleware.ts(인바운드 socket.on)` → `opponentsActions.spectrumUpdate()` → UI에서 상대 필드 높이 시각화

5. **플레이어 Topout & 게임 종료 (Player Elimination & Win Condition)**
   - 클라이언트: 로컬로 새 piece spawn 불가 또는 penalty로 stack overflow → `topOut()` 액션 (gameSlice.ts:133, 372-373)
   - `socketMiddleware` (middleware.ts:57-67): status idle→gameover 전환 감지 + 메시지 수신 아님 → `socket.emit('player:topout', {atPieceIndex})`
   - 서버: `handleTopout` (packages/server/src/socket/index.ts:143-160)
     - `g.eliminate(playerId)` → player.alive = false (packages/server/src/models/Game.ts:188-192)
     - `player:gameover` broadcast: `{playerId, name}`
     - 승부 판정: `g.checkWinAfterChange()` (Game.ts:223-227) → `winner()` (Game.ts:200-221)
       - **승리 조건**:
         - 멀티플레이(starter >= 2) + 생존 1명 → "last-standing" 우승자
         - 멀티플레이 + 생존 0명 → "everyone-left" (우승자 없음)
         - 싱글플레이(starter = 1) + 생존 0명 → "solo-end"
     - 결정되면 `game:over` broadcast: `{winnerId, winnerName, reason}`
     - status 전환: `'playing' → 'ended'`
   - 클라이언트: `middleware.ts(인바운드 socket.on)` → `gameActions.topOut()` 또는 `gameActions.gameOver()` dispatch → UI 반영

6. **Disconnect/Leave 처리**
   - 클라이언트: `leave` emit 또는 disconnect 이벤트
   - 서버: `handleExit` (packages/server/src/socket/index.ts:162-187)
     - `leave` → `g.removePlayer()`, `disconnect` → `g.handleDisconnect()` (soft disconnect, reconnect 슬롯 유지)
     - 호스트 이탈 → `electHost()` (Game.ts:96-106): 가장 먼저 join한 connect 플레이어로 승격
     - 게임 중이면 윈 판정 재계산
     - room이 비면 registry에서 삭제

**구현**

**Socket 이벤트 정의** (packages/shared/src/protocol.ts)
- **ClientToServerEvents** (클라이언트 → 서버):
  - `join(payload: JoinPayload, ack)` — room, name
  - `start(ack)` — 호스트만
  - `restart(ack)` — 호스트만, 다시 로비로
  - `board:locked(p: LockReport)` — board, pieceIndex, linesCleared
  - `spectrum:report(p: SpectrumReport)` — spectrum array (길이 10)
  - `player:topout(p: TopoutReport)` — atPieceIndex
  - `leave()` — explicit exit
  - `set-mode(mode: GameMode)` — 호스트, classic/challenge 선택 (보너스)
  - `score:report(p: ScoreReport)` — 보너스 점수 기록

- **ServerToClientEvents** (서버 → 클라이언트):
  - `room:state(s: RoomState)` — players[], status, hostId, seed, room, mode
  - `host:changed(p: HostChangedPayload)` — hostId, reason ('assigned'|'migrated')
  - `game:started(p: GameStartPayload)` — seed, startedAt, players, mode
  - `penalty:apply(p: PenaltyApplyPayload)` — count(n-1), fromId, fromName
  - `spectrum:update(p: SpectrumUpdatePayload)` — id, name, spectrum
  - `player:gameover(p: PlayerGameOverPayload)` — playerId, name
  - `game:over(p: GameOverPayload)` — winnerId, winnerName, reason
  - `server:error(e: ProtocolError)` — code, message, fatal

**N-1 Penalty 메커니즘** (packages/server/src/models/Game.ts:163-171)
```typescript
registerLineClear(playerId: string, n: number): PenaltyDistribution {
  const penaltyCount = Math.max(0, n - 1);  // n=1 → 0, n=2 → 1, n=4 → 3
  const targets = penaltyCount === 0 ? [] 
    : this.players.filter((p) => p.id !== playerId && p.alive).map((p) => p.id);
  return { from: playerId, linesCleared: n, penaltyCount, targets };
}
```
각 타겟 플레이어는 서버에서 `penalty:apply` emit 받음 → 클라이언트의 `addPenaltyLines(board, penaltyCount)` 실행 (packages/client/src/engine/penalty.ts)

**Spectrum 계산** (packages/client/src/engine/spectrum.ts:8-21)
```typescript
export const computeSpectrum = (board: Board): number[] => {
  const spectrum: number[] = [];
  for (let col = 0; col < BOARD_WIDTH; col++) {  // 10 columns
    let height = 0;
    for (let row = 0; row < BOARD_HEIGHT; row++) {  // 20 rows
      if (board[row]![col] !== EMPTY) {
        height = BOARD_HEIGHT - row;  // topmost filled cell의 높이
        break;
      }
    }
    spectrum.push(height);
  }
  return spectrum;
};
```
각 열의 최상단 filled cell까지의 높이를 0..20으로 반환 → 상대 필드의 구릉 모양 시각화

**Win Condition** (packages/server/src/models/Game.ts:200-221)
- `starterIds`: 게임 시작 시의 connected 플레이어 집합 (disconnect한 ghost는 이미 eliminated)
- 멀티플레이(`starterIds.size >= 2`) → 마지막 남은 플레이어 or 모두 탈락
- 싱글플레이(`starterIds.size === 1`) → 혼자 topout 또는 목표 달성

**평가 때 이렇게 말하라**

"멀티플레이 흐름을 보여드리겠습니다. 먼저, URL로 room과 player_name을 입력하면 클라이언트가 socket.io로 join 이벤트를 보냅니다 (protocol.ts:119). 서버가 room을 가져오거나 생성하고 (RoomManager.ts:7), 첫 플레이어를 호스트로 할당합니다 (Game.ts:52-65).

호스트가 START를 누르면 start 이벤트로 현재 시간 기반 seed를 생성합니다 (Game.ts:129). 이 seed를 game:started 이벤트로 모든 클라이언트에 브로드캐스트하면, 클라이언트들이 같은 pieceAt(seed) 함수로 동일한 테트로미노 시퀀스를 얻습니다 (middleware.ts(인바운드 socket.on)).

플레이 중, 라인을 클리어하면 클라이언트가 board:locked와 spectrum:report를 보냅니다 (middleware.ts:46-55). 서버는 registerLineClear에서 n-1 계산을 합니다 — 2줄이면 1줄 페널티, 4줄이면 3줄 페널티 (Game.ts:165). 이 페널티는 indestructible 행(PENALTY constant)으로 각 상대의 board 하단에 추가됩니다 (penalty.ts:11-19).

spectrum:update는 매 lock마다 broadcast되어, UI에서 상대의 필드 높이를 실시간으로 봅니다 (middleware.ts(인바운드 socket.on)). player:topout 이벤트로 첫 탈락자를 알리고, 게임 끝 시 winner 판정은 starterIds 기반입니다 — 멀티플레이면 last-standing, 싱글플레이면 solo-end (Game.ts:200-221). game:over 이벤트가 브로드캐스트되어 모두가 끝을 앎니다 (socket/index.ts:153-157)."

**시연·확인**

1. **로컬 멀티플레이 테스트**: 브라우저 2개(또는 탭 2개) → 같은 room 입력 → 호스트가 START → 똑같은 piece sequence 나오는지 확인
2. **N-1 페널티 확인**: 
   - 터미널에서 서버 로그 활성화 (디버그 미들웨어 추가)
   - Player 1이 4줄 클리어 → console에 "penaltyCount: 3" 출력
   - Player 2의 spectrum이 급상승 (bottom에 3줄 추가)
3. **실시간 Spectrum**: 한 플레이어가 큰 구멍을 파면 상대의 spectrum 뷰에서 그 열의 높이가 0 또는 낮게 표시
4. **마지막 생존자 우승**: 3명 중 2명이 topout → 남은 1명만 winnerId에 기록되고 "last-standing" reason 확인

코드 상 key landmarks:
- packages/shared/src/protocol.ts:107-130 — 전체 이벤트 타입 정의
- packages/server/src/socket/index.ts:203-217 — 모든 핸들러 등록
- packages/client/src/socket/middleware.ts — Redux dispatch 연결
- packages/client/src/socket/middleware.ts:45-55 — **lock-report 단일 경로** (중요: 한 번만 emit)

---

## 7. 렌더링 (Canvas/SVG/<TABLE> 금지 → CSS grid div)

**개념**
게임 필드는 CSS grid를 이용해 200개의 순수 `<div>` 셀로 렌더링되며, 유령 조각(ghost piece)과 상대방의 스펙트럼 미니필드까지 모두 div와 flexbox/grid로만 표현한다. Canvas, SVG, `<table>`, jQuery는 사용하지 않음.

**스펙 근거**
PDF 스펙 p.5 (Chapter IV, General Instructions)에서 명시:
- "HTML must not use `<TABLE />` elements. Layouts must use grid or flexbox."
- "The following are prohibited: DOM manipulation libraries (e.g., jQuery), Canvas, SVG (Scalable Vector Graphics)."
- "There is no need to directly manipulate the DOM."

**동작 방식**

1. **메인 보드 (10×20 그리드)**
   - `Board.tsx:49` — `<div role="grid">` 컨테이너가 CSS grid를 정의.
   - `Board.module.css:134–146` — `grid-template-columns: repeat(10, var(--cell))`, `grid-template-rows: repeat(20, var(--cell))`.
   - 200개의 셀을 `grid.flatMap((row, r) => row.map((value, c) => <Cell />))` 로 매핑: 각 셀은 `data-cell` 값(0–9)을 가진 순수 div.

2. **셀 렌더링 (0–7: 보드 상태, 8: 패널티, 9: 유령)**
   - `Cell.tsx:17–22` — `<div>` with 동적 CSS class (`styles.c1` ~ `styles.c7`, `styles.ghost`, `styles.penalty`, `styles.empty`).
   - `Cell.module.css:27–101` — 각 클래스는 `background` 색상과 `box-shadow` 효과만 사용.
   - 클래스 맵: `CLASS: Record<number, string>` (1–7번 색상, 9번 유령).

3. **유령 조각 오버레이**
   - `render.ts:11–33` — `overlayForRender()` PURE 함수: 인증 보드 + 현재 조각 + 유령 조각을 하나의 `RenderCell[][]` 그리드로 합성.
   - 유령(9)은 빈 셀에만 렌더링 가능 (라인 19–21).
   - 현재 조각은 유령 위에 그려짐 (라인 24–30).

4. **상대방 스펙트럼 미니필드**
   - `OpponentsPanel.tsx:33–41` — `.well` div가 `grid-template-columns: repeat(10, 1fr)` (10열).
   - 각 열은 `FlexContainer(.col)` + 높이 비율로 채워짐: `<div className={styles.fill} style={{ height: \`${(h / 20) * 100}%\` }} />`.
   - `spectrum.ts:8–21` — `computeSpectrum()` PURE 함수: 각 열의 최고 블록 높이를 0–20으로 반환.
   - 높이 대역(low/mid/high/crit)에 따라 `data-zone` 속성으로 색상 구분 (OpponentsPanel.module.css:165–177).

5. **효과 (애니메이션은 순수 CSS)**
   - 라인 클리어 플래시: `Board.module.css:59–113` keyframe (`clearFlash`, `clearFlashTetris`).
   - 하드 드롭 흔들림: `Board.module.css:18–35` animation, `board.tsx:30–38`에서 reflow로 재시작.
   - 셀 잠금 플래시: `Cell.module.css:11–25` (`justLocked` 애니메이션).
   - 공격 펄스: `OpponentsPanel.module.css:45–64` (`attackPulse`).

**구현**

주요 파일:
- `packages/client/src/components/Board.tsx:40–59` — 메인 보드 렌더.
- `packages/client/src/components/Board.module.css:134–146` — `display: grid; grid-template-columns: repeat(10, var(--cell))`; gap: 2px`.
- `packages/client/src/components/Cell.tsx:17–22` — 셀은 `<div className={styles.cell} data-cell={value} />`.
- `packages/client/src/components/Cell.module.css:1–101` — 색상/효과는 `background`와 `box-shadow`만 사용.
- `packages/client/src/engine/render.ts:11–33` — PURE 함수로 보드 + 조각 + 유령을 단일 2D 배열로 합성 (공급측 관심사 분리).
- `packages/client/src/components/OpponentsPanel.tsx:33–41` — `.well` div, `grid-template-columns: repeat(10, 1fr)`.
- `packages/client/src/components/OpponentsPanel.module.css:142–177` — 스펙트럼 미니필드 그리드 및 높이 기반 색상.
- `packages/client/src/engine/spectrum.ts:8–21` — 높이 계산 PURE 함수.

왜 이렇게? 
- **렌더링 로직과 게임 로직 분리**: `overlayForRender()`는 서버의 board + client의 current/ghost를 받아 단순 2D 배열을 반환하므로, 게임 상태와 무관하게 재사용 가능.
- **CSS grid의 성능**: 200개 셀의 위치를 grid 레이아웃으로 관리하면 리플로우 최소화.
- **장면 컨테이너 재시작 피하기**: `Board.tsx:27–38`에서 `offsetWidth` 리플로우를 이용해 drop 애니메이션 keyframe을 재시작 (200셀 리마운트 대신).

**평가 때 이렇게 말하라**

"메인 보드는 Board.tsx에서 `overlayForRender()`로 만든 200개 셀의 값(0–9)을 map해서 Cell 컴포넌트로 렌더합니다. 각 Cell은 data-cell 속성에 값을 넣고, CSS 클래스로 색상을 정합니다. Board.module.css에 `grid-template-columns: repeat(10, var(--cell))`, `grid-template-rows: repeat(20, var(--cell))`로 10열 20행 그리드를 정의했고, 각 Cell은 CSS 클래스에 따라 background와 box-shadow로만 스타일되어 있습니다.

유령은 render.ts의 overlayForRender() 함수에서 값 9로 오버레이되고, Cell.module.css의 .ghost 클래스가 흰색 테두리로 표현합니다.

상대방 스펙트럼은 OpponentsPanel.tsx에서 10열 grid로 만들고, 각 열에 높이 비율의 div를 넣어서 bar chart처럼 보입니다. spectrum.ts 함수에서 각 열의 최고 블록 높이를 계산합니다.

Canvas, SVG, table은 전혀 사용하지 않으므로 Board.test.tsx 라인 11–13에서 `querySelector('canvas/svg/table')`이 null인지 확인하는 테스트가 통과합니다."

**시연·확인**

보드 검증:
```bash
npm test -- Board.test.tsx
# ✓ renders exactly 200 cells (10×20), all divs
# ✓ querySelector('canvas') === null
# ✓ querySelector('svg') === null  
# ✓ querySelector('table') === null
```

금지 기술 grep:
```bash
# Canvas 사용 확인
grep -r "<canvas\|Canvas" packages/client/src --include="*.tsx" --include="*.ts"
# (결과 없음 — Board.tsx 라인 8은 주석일 뿐)

# SVG 사용 확인
grep -r "<svg\|SVG" packages/client/src --include="*.tsx" --include="*.ts"
# (결과 없음)

# TABLE 사용 확인
grep -r "<table\|<TABLE" packages/client/src --include="*.tsx" --include="*.ts"
# (결과 없음)

# jQuery 사용 확인
grep -r "jQuery\|\$(" packages/client/src --include="*.tsx" --include="*.ts" | grep -v "useKeyboard\|^\s*//"
# (jQuery 사용 없음)
```

CSS Grid 구조 확인 (DevTools에서):
- 메인 보드: `<div role="grid">` 자식 200개 `<div data-cell="...">`.
- Spectrum 미니필드: `<div className={styles.well}>` 내 10개 column div (각각 1fr 너비).

---

## 8. 리액티브 패턴 & FRP (Redux + flyd, 게임 루프, lock delay)

- **개념**
  Redux Toolkit으로 상태를 관리하고, flyd 스트림으로 입력(키보드)과 시간(gravity/lock delay)을 처리하는 순수 함수형 게임 루프. 두 개의 독립된 타이머(gravity 틱 vs. 고정 lock delay)가 현대식 Tetris(TETR.IO/Jstris)의 느낌을 구현하며, 회전이나 이동 후 "마지막 순간" 조정(T-spin, tuck)을 허용한다.

- **스펙 근거**
  - III(Objectives): "reactive patterns" 구현 필수 (page 4)
  - VI(Bonus): "Functional Reactive Programming (FRP)" 제안; `flyd` 라이브러리 언급 (page 11)
  - V.1.1(Piece Movement): "it becomes immobile only on the next frame—allowing last-moment adjustments" (page 7) — 프로젝트는 이 의도를 500ms lock delay로 실현하며, 이는 현재 테트리스 가이드라인 표준이자 평가자 재량에 따라 엄격한 1-frame grace로 변경 가능

- **동작 방식**

  1. **Redux 상태 관리** (packages/client/src/store/gameSlice.ts)
     - `gameSlice`: 게임 보드, 현재 피스, 다음 큐, lock delay 재-armed 카운터(`lockResets`), 마지막 동작이 회전인지 여부(`lastWasRotation`) 저장
     - 모든 액션(move, rotate, tick, lockDown, applyPenalty)이 순수 reducer로 실행되어 이뮤터블 상태 업데이트

  2. **두 개의 독립된 타이머**
     - **Gravity 루프** (packages/client/src/hooks/useGameLoop.ts:36–44)
       - `runGravityLoop(interval, onTick)` (packages/client/src/frp/streams.ts:72–84)로 flyd 스트림 기반 interval 생성
       - 각 틱마다 `gameActions.tick()` dispatch → `moveDown` 시도
       - 높이: `GRAVITY_MS` (1000ms, 기본); 소프트드롭 시 `SOFT_DROP_MS` (50ms)
       - rising 모드에서는 레벨별로 가속 (최소 120ms)
       - **중요**: 중력 틱은 절대 piece를 lock하지 않음. 접지된 상태로 남으면 다음 gravity tick도 내려가지 않음 (진행 방지)

     - **Lock delay 타이머** (useGameLoop.ts:48–52)
       - `LOCK_DELAY_MS = 500ms` 고정 타이머
       - `grounded && !playable` → timeout 시작
       - timeout 만료 시 `gameActions.lockDown()` dispatch → `isGrounded` 재확인 후 lock
       - **재-arm 메커니즘**: 접지된 상태에서 move/rotate 성공 시 `lockResets` 증가 (최대 `MAX_LOCK_RESETS = 15`) → useEffect deps에서 timeout 재시작
       - 이는 player가 재설정 예산을 소모할 때까지 tuck과 T-spin을 실행할 수 있게 함 (anti-stall)

  3. **키보드 입력 스트림** (packages/client/src/hooks/useKeyboard.ts)
     - 두 개의 flyd 스트림: `down$`, `up$`
     - 각 keydown/keyup을 pure `keyToIntent('down'|'up', key)` (packages/client/src/frp/streams.ts:18–50)로 변환
     - **DAS/ARR**: 좌우 이동은 OS 자동반복이 아닌 자체 타이머로 구현
       - 초기 누름: 즉시 step
       - `DAS_MS` (130ms) 후: auto-repeat 시작
       - 이후 `ARR_MS` (20ms)마다 step
       - 반대쪽 key가 여전히 눌려있으면 hand over (취소 후 자동반복 재시작)
     - rotation, hard drop, hold는 스트림 이벤트 후 즉시 dispatch

  4. **Lock event 보고** (packages/client/src/socket/middleware.ts:45–55)
     - reducer 실행 후 `lockEvent` 필드가 set되면 socket.io로 서버에 보고 (정확히 한 번)
     - 클리어된 라인 수, 피스 인덱스, 최종 보드 상태 포함
     - `clearLockEvent()` 호출로 즉시 지워서 중복 보고 방지

- **구현**

  | 핵심 요소 | 파일:라인 | 설명 |
  |----------|---------|------|
  | Gravity loop | frp/streams.ts:72–84 | flyd interval 스트림 → onTick 콜백 호출 |
  | Lock delay re-arm | gameSlice.ts:124–131 `reArm()` | 접지 여부 확인 후 lockResets 증가 (cap at MAX_LOCK_RESETS) |
  | Lock-delay timer deps | useGameLoop.ts:48–52 | `lockResets` in deps → timeout 재시작 |
  | DAS/ARR state machine | useKeyboard.ts:26–61 | closure-local 변수 (no `this`) 로 타이머 관리 |
  | Lock event guard | socket/middleware.ts:45–55 | `after.game.lockEvent` 체크 → emit + clearLockEvent() |
  | T-spin 인식 | gameSlice.ts:146–156 `isTSpin()` | 3-corner rule + `lastWasRotation` 플래그 |
  | Tick 액션 | gameSlice.ts:336–345 | gravity만 작동; moveDown 후 접지 상태 유지 시 아무것도 하지 않음 |
  | Lock-down 액션 | gameSlice.ts:348–351 | lockDown timer 만료 후 접지 상태 최종 확인 후 commitLock() |

  **왜 이렇게**: Redux는 비동기 액션을 다루지 않으므로 (useEffect 기반) gravity와 lock-delay는 hook layer에서 관리. flyd는 FRP bonus로 DOM 진동을 줄이고 선언적 stream 변환을 가능하게 함. 두 타이머 분리는 기존 Tetris가 "piece는 ~2초에 settle"하던 문제를 해결 (gravity의 속도에 무관하게 lock delay는 항상 500ms).

- **평가 때 이렇게 말하라**

  > 게임 루프는 Redux와 flyd 스트림 두 층으로 나뉩니다. 먼저 Redux state (gameSlice)는 board, current piece, lockResets, lastWasRotation을 관리합니다. 그리고 두 개의 독립된 타이머가 있습니다:
  > 
  > 1. **Gravity 루프** — flyd interval 스트림으로 구동되며, GRAVITY_MS(1초) 또는 소프트드롭 시 SOFT_DROP_MS(50ms)마다 tick을 dispatch합니다. 이 tick은 moveDown만 시도하고, 절대 lock하지 않습니다. 
  >
  > 2. **Lock delay 타이머** — 고정 500ms입니다. Piece가 접지되면 타이머 시작. 만료 시 isGrounded 재확인 후만 lock. 하지만 접지 상태에서 move나 rotate 성공하면 lockResets를 증가시키고 타이머가 재시작됩니다. 이 덕분에 T-spin과 tuck이 가능합니다.
  >
  > 3. **입력** — 키보드는 두 개의 flyd 스트림(keydown, keyup)으로 전환되어 매 이벤트마다 pure `keyToIntent()` 함수를 거칩니다. DAS/ARR는 자체 타이머로 구현되어 OS 자동반복을 무시하고 TETR.IO처럼 느껴집니다.
  >
  > **Lock delay와 "마지막 순간" 조정** — 스펙의 "immobile only on the next frame"은 last-moment adjustment를 의도합니다. 우리는 이를 500ms lock delay(현재 가이드라인 표준)로 구현했습니다. 이렇게 하면 player가 T-spin을 설정하기에 충분한 여유가 생깁니다. 만약 평가자가 엄격한 1-frame grace(약 16ms)를 원하면 LOCK_DELAY_MS를 16으로 변경하기만 하면 됩니다.

- **시연·확인**

  1. **Gravity & lock delay 분리 확인**
     ```bash
     # rising 모드 또는 soft-drop으로 gravity 속도 변경:
     # - gravity는 빨라지지만 lock delay는 항상 500ms
     # - 접지된 피스가 정확히 500ms 후 lock (다른 input 없을 시)
     ```

  2. **Lock reset 메커니즘 확인**
     - T-piece를 corner 근처에서 rotate시키거나 좌우로 wiggle하기
     - 각 성공한 이동/회전 후 lock timer가 500ms로 재시작됨 (최대 15번)
     - 15번째 후 더 이상 재-arm 안 됨 (anti-stall)

  3. **입력 스트림 로직**
     - packages/client/src/hooks/useKeyboard.ts를 열고 flyd.on() 구독 확인
     - DAS 타이머는 line 49, ARR 타이머는 line 51에서 구동
     - packages/client/src/frp/streams.ts의 `keyToIntent()` pure 함수로 key→intent 변환 확인

  4. **Socket 보고**
     - Chrome DevTools → Network 탭에서 socket.io 메시지 보기
     - piece lock 시 `board:locked` + `spectrum:report` 정확히 한 번만 emit (middleware.ts:45–55)

  5. **코드 인스펙션** (optional)
     ```bash
     # Redux store → game state 보기 (Redux DevTools)
     # - lockResets 값 변화 (이동/회전 시 증가, 부유 시 0)
     # - lastWasRotation 플래그 (T-spin 인식용)
     # - lockEvent 필드 (emit 후 즉시 null)
     ```

---

---

## 9. 보너스 구현 (점수 · 영속화 · 게임 모드 · 솔로 목표)

- **개념**
  보너스는 필수 기능(네트워크 멀티플레이 & 마지막까지 생존이 승리조건)을 완전히 유지하면서, 채점 시스템, 스코어 저장소, 게임 모드, 솔로 챌린지 목표를 추가한 것입니다. 핵심은 **점수가 승리 조건을 절대 영향하지 않는다**는 점—멀티에서는 점수 무관하게 마지막까지 남아있어야 승리이고, 솔로 목표는 점수와 독립적인 라인 수 달성으로만 완료됩니다.

- **스펙 근거**
  PDF 11쪽 보너스 파트에서 "(1) 채점 시스템 추가, (2) 플레이어 점수 저장, (3) 새로운 게임 모드 (예: invisible, gravity 상승) 제안" — 그리고 큰 경고: "보너스 기능은 필수 요구가 완전하고 기능할 때만 평가됩니다."

- **동작 방식**
  1. **점수 계산** — 라인 클리어 시 `SCORE_TABLE[라인수] × 현재레벨` (gameSlice.ts:193–196), T-스핀 보너스 (400~1600 × 레벨), 콤보 보너스 (연속 클리어마다 50 × 레벨), Perfect Clear (3500 × 레벨), 소프트 드롭 (1점/칸).
  2. **점수 전송 & 저장** — 게임 오버 시 클라이언트가 `score:report` 소켓 이벤트로 서버에 전송 (middleware.ts). 서버는 `scoreStore.record(이름, 점수, 타임스탬프)`로 JSON 파일에 저장 (scoreStore.ts:28–34, FEATURE_PERSISTENCE 활성화 시).
  3. **게임 모드** (보너스)
     - `classic`: 기본값, 모든 블록 보임.
     - `invisible`: Board.tsx:19–20에서 렌더링용 빈 보드로 치환 → 화면에는 떨어지는 현재 피스와 게스트 피스만 보이고 스택은 안 보임.
     - `rising`: 레벨 올라가면서 중력 가속 (useGameLoop.ts:39–41): `Math.max(120ms, 1000ms - (레벨-1)×80ms)` → 최대 120ms까지 빨라짐.
  4. **솔로 목표** (보너스)
     - `endless`: 기본, 승리 조건 없음.
     - `sprint`: 정확히 40라인 클리어 (constants.ts:65).
     - `marathon`: 정확히 150라인 클리어 (constants.ts:66).
     - useSoloObjective.ts:20–25에서 라인 수 도달 감시, 달성 시 `objectiveComplete` 액션 → 게임 오버 상태 진입, 경과 시간 + 최종 통계 기록.

- **구현**
  - **점수 계산**: packages/client/src/store/gameSlice.ts:193–220 (`commitLock` 함수)
    - 라인 클리어 카운트 `n`에 따라 `SCORE_TABLE[n]` 또는 T-스핀 전용 `TSPIN_SCORE[n]` 선택 (158–159줄).
    - 3코너 규칙으로 T-스핀 판정 (146–156줄): 회전이 마지막 이동이었고, T피스의 바운딩박스 모서리 3개 이상이 채워져 있으면 T-스핀.
    - 콤보 체인 추적 (189줄 `combo += 1`, 195줄 `COMBO_BONUS * (combo - 1) * level`).
    - Back-to-Back 추적 (190줄: Tetris나 T-스핀 클리어 시 `b2b += 1`, 다른 클리어 시 리셋).
    - Perfect Clear 보너스 (192줄: 보드 완전히 비었으면 3500 × 레벨).
  - **상수**: packages/shared/src/constants.ts:54–72
    - `SCORE_TABLE = [0, 100, 300, 500, 800]` (인덱스는 클리어 라인 수).
    - `COMBO_BONUS = 50`, `PERFECT_CLEAR_BONUS = 3500`.
    - `SOFT_DROP_POINTS = 1` (gameSlice.ts:288, 343줄에서 적용).
  - **스코어 저장소**: packages/server/src/persistence/scoreStore.ts:16–41
    - 파일 기반 (zero deps), 점수 > 0이고 유한한 값만 기록 (29줄).
    - `record(이름, 점수, 타임스탬프)` → entries 배열에 추가, 내림차순 정렬, 상위 200개만 유지.
    - `top(limit)` → 상위 N개 반환.
    - `createNoopScoreStore()`로 필수 빌드는 저장 비활성화 (FEATURE_PERSISTENCE 플래그).
  - **UI**: 
    - ScoreHUD.tsx: 게임 중 점수, 라인, 레벨 표시 (FEATURES.SCORING 플래그로 조건부).
    - ObjectiveHUD.tsx: 솔로 목표 진행 상황 (남은 라인 수, 실시간 시계) 표시.
    - Lobby.tsx:32–68: 호스트가 모드와 목표 선택 (FEATURES.GAME_MODES).
  - **게임 모드 기본값**: gameSlice.ts:100, startGame 리듀서에서 `mode ?? 'classic'`, `objective ?? 'endless'`.
  - **Invisible 구현**: Board.tsx:19–20 — 렌더링할 때만 빈 보드 사용, 실제 상태는 그대로 유지 (ghostPiece 계산도 실제 보드 기준).
  - **Rising Gravity**: useGameLoop.ts:38–44 — 상태 변화마다 gravity 간격 재계산.
  - **목표 완료 감시**: useSoloObjective.ts:20–25 — `lines >= goal` 감시, 도달 시 `objectiveComplete({ timeMs: Date.now() - startedAtMs })` 디스패치.
  - **소켓 통신**:
    - 클라이언트 middleware.ts: 게임 오버 시 `score:report` 이벤트 전송 (FEATURES.SCORING).
    - 서버 socket/index.ts: `socket.on('score:report', (p) => handleScore(socket, store, p))` — store.record() 호출.
    - 클라이언트가 언제든 `leaderboard` 요청 시 서버는 `store.top(10)` 반환.

- **평가 때 이렇게 말하라**
  > "보너스는 필수 게임플레이를 전혀 건드리지 않았습니다. 점수가 승리를 결정하지 않고, 마지막까지 생존한 플레이어만 이기는 규칙은 그대로입니다. 추가로 구현한 게 네 가지예요: 
  >
  > 첫째, 채점 시스템 — 라인 수, T-스핀, 콤보, Perfect Clear에 따라 점수 계산. 레벨이 올라가면서 점수 배수도 커지죠.
  >
  > 둘째, 점수 저장소 — 게임 끝나면 점수를 JSON 파일에 이름과 함께 저장해서 leaderboard에 반영합니다.
  >
  > 셋째, 게임 모드 — Classic은 기본, Invisible은 스택이 안 보이고 현재 피스와 게스트만 보임. Rising은 레벨 올라가면서 중력이 빨라져요.
  >
  > 넷째, 솔로 목표 — Sprint는 40라인, Marathon은 150라인 클리어 레이스. 멀티플레이에서는 비활성화되고 솔로만 선택 가능합니다.
  >
  > 코드로는 constants에서 점수 테이블과 보너스 상수 정의하고, gameSlice의 commitLock 함수에서 라인 클리어 시 점수 계산하고, 서버의 scoreStore로 파일에 저장합니다. 클라이언트에서 socket으로 최종 점수를 전송해요."

- **시연·확인**
  1. **점수 계산 확인**:
     ```bash
     npm run test -- gameSlice.test.ts
     ```
     → objectiveComplete, T-스핀, Perfect Clear 테스트 통과 확인.
  
  2. **게임 모드 선택**:
     - 게임 클라이언트 로비에서 MODE 버튼 보기 (classic / invisible / rising).
     - Invisible 선택 후 게임 시작 → 스택이 비어 보이고 현재/게스트 피스만 보임.
     - Rising 선택 → 레벨 올라가면서 피스가 점점 빠르게 떨어지는 것 확인.
  
  3. **솔로 목표**:
     - 로비에서 혼자 SOLO GOAL 버튼으로 sprint/marathon 선택 (멀티는 비활성화).
     - Sprint 40라인 도달 → 화면에 "CLEAR!" 표시, 게임 자동 종료, ObjectiveHUD에 경과 시간 표시.
  
  4. **점수 저장**:
     ```bash
     FEATURE_PERSISTENCE=true npm run dev
     ```
     → 게임 종료 후 `./scores.json` 파일 확인.
     ```bash
     cat scores.json | jq '.[0:5]'
     ```
     → 이름과 점수가 내림차순으로 저장된 상위 5개 항목.
  
  5. **코드 문서화**:
     - `/packages/client/src/store/gameSlice.ts:193–220` — 점수 계산 로직.
     - `/packages/client/src/hooks/useSoloObjective.ts` — 목표 감시.
     - `/packages/server/src/persistence/scoreStore.ts` — 파일 저장소.
     - `/packages/client/src/components/Board.tsx:19–20` — Invisible 모드.
     - `/packages/client/src/hooks/useGameLoop.ts:38–44` — Rising 중력.

---

## 10. 테스트 & 커버리지

**개념**

226개 테스트가 34개 파일에 분산되어, 총 3개 패키지(shared, server, client) 전체를 다룹니다. Vitest(v8 coverage)로 실행하면 실시간으로 4가지 메트릭(문장, 함수, 행, 분기)을 측정하며, 스펙 요구 기준(70%/70%/70%/50%)을 모두 초과(91.9%/91.6%/91.9%/86.7%)합니다.

**스펙 근거**

PDF 제5장 V.2.5 "Testing" (p. 10) — "Unit tests must cover at least 70% of statements, functions, and lines, and at least 50% of branches."
스펙 III "Objectives"에서도 "you will also write unit tests that meet industrial-level standards for continuous delivery pipelines"로 명시.

**동작 방식**

1. **구조**: root `vitest.config.ts`(vitest.config.ts:10-64)에서 2개 프로젝트 정의:
   - **node 프로젝트**: `packages/server/**/*.{test,spec}.ts` + `packages/shared/**/*.{test,spec}.ts` (Node 환경)
   - **client 프로젝트**: `packages/client/**/*.{test,spec}.{ts,tsx}` (jsdom 환경 + React Testing Library)

2. **공유 패키지 테스트** (packages/shared/src):
   - `rng.test.ts`: 결정적 난수생성(mulberry32), 7종류 피스 순서 검증, 같은 시드→같은 수열 보장 (재현 가능성)
   - `tetrominoes.test.ts`: 전체 피스 모양, 회전 상태, 킥 테이블 무결성 (7종×4회전 = 28개 조합)
   - `constants.test.ts`: 상수 값 정합성

3. **서버 모델 테스트** (packages/server/src/models):
   - `Game.test.ts`: 호스트 선출, 플레이어 재접속, 게임 상태 전이(로비→진행→종료)
   - `Player.test.ts`, `Piece.test.ts`: OOP 인스턴스 생명주기
   - `RoomManager.test.ts`: 동시 게임 관리
   - `integration.test.ts`: socket.io 양방향 통신 시뮬레이션 (11개 통합 테스트)

4. **클라이언트 엔진 테스트** (packages/client/src/engine):
   - `board-state.test.ts` (8개): 스펙트럼 계산(높이), 게임오버 판정
   - `movement.test.ts` (20개): 좌우 이동, 회전, 충돌 감지
   - `stack.test.ts` (13개): 라인 클리어, 음각 처리

5. **클라이언트 Redux 스토어** (packages/client/src/store):
   - `gameSlice.test.ts` (41개): 액션(이동, 회전, 락, 하드드롭), 상태 변이
   - `lobbySlice.test.ts`, `opponentsSlice.test.ts`: UI 상태 관리

6. **React 컴포넌트** (packages/client/src/components):
   - `Landing.test.tsx`, `Lobby.test.tsx`, `Board.test.tsx` 등: @testing-library/react로 렌더링 + 사용자 이벤트 시뮬레이션

**구현**

**vitest 설정**:
- vitest.config.ts:14 — 공유 패키지를 TS 소스(`@red-tetris/shared` → `packages/shared/src/index.ts`)로 별칭(빌드 필요 없음)
- vitest.config.ts:36-62 — coverage 옵션:
  - provider: 'v8' (Google V8 엔진 계측)
  - all: true (모든 파일 추적)
  - exclude: 타입 전용 파일(`types.ts`, `protocol.ts`), 진입점(`index.ts`, `main.tsx`), 소켓 설정(`socket/**`), HTTP 라우터 등 순수 비즈니스 로직 없는 부분 제외
  - thresholds: `{ statements: 70, functions: 70, lines: 70, branches: 50 }` (스펙 최소 기준)

**테스트 전략**:

| 계층 | 심볼 | 테스트 유형 | 예시 |
|------|------|-----------|------|
| 공유(shared) | RNG, Tetrominoes, 상수 | 단위(수치, 목록) | `pieceAt(42, 0)` 결정성 검증 |
| 엔진(client/engine) | 보드 상태, 충돌, 움직임 | 단위(함수) | `moveLeft()`, `rotate()` 경계조건 |
| 저장소(store) | 리듀서 액션 | 단위(상태머신) | `gameSlice.test.ts:23-55` — 움직임 시 상태만 변함 |
| 컴포넌트(components) | React 렌더링 | 통합(UI이벤트) | Landing `render()` → 버튼 클릭 → 상태 변경 |
| 네트워크(socket) | 핸들러 | 통합(socket.io) | `integration.test.ts:50-60` — 클라이언트/서버 에코 |

**핵심 패턴**:
- **결정성**: 같은 시드 → 같은 피스 수열 (tetrominoes.test.ts, gameSlice.test.ts에서 seed=42 고정)
- **불변성**: 함수가 입력 수정하지 않음 (shuffleBag 테스트에서 PIECE_ORDER 검증)
- **상태 머신**: Redux 액션 적용 전후 상태 비교 (gameSlice.test.ts:35-50)
- **React Testing Library 최소주의**: DOM 쿼리 대신 `getByRole()`, 실제 사용자 흐름 재현

**평가 때 이렇게 말하라**

> "프로젝트 전체를 3개 계층으로 테스트했습니다. 먼저 shared 패키지는 난수와 테트로미노 형태의 결정성을 보장합니다 — 같은 시드면 클라이언트, 서버 모두 같은 피스 수열을 얻습니다. 다음 엔진은 움직임, 회전, 충돌 같은 핵심 게임 로직을 순수 함수로 테스트했고, Redux 스토어는 액션을 적용했을 때 상태가 올바르게 변함을 검증합니다. 마지막으로 React 컴포넌트와 socket.io 통합은 실제 사용자 흐름으로 테스트했습니다.
> 
> 총 226개 테스트가 34개 파일에 있고, 커버리지는 문장 91.93%, 함수 91.62%, 행 91.93%, 분기 86.74%입니다 — 스펙 요구(70%/70%/70%/50%)를 모두 초과합니다. 타입 정의나 HTTP 설정 같은 비즈니스 로직 없는 파일은 제외했습니다."

**시연·확인**

평가자 앞에서 이 명령을 실행하세요:

```bash
npm run coverage
```

결과는 다음처럼 표시됩니다:

```
Test Files  34 passed (34)
     Tests  226 passed (226)
   Start at  13:46:08
   Duration  3.79s

% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|-------------------
All files          |   91.93 |    86.74 |   91.62 |   91.93 |
```

**4가지 메트릭 설명**:
- **% Stmts (문장)**: 코드 한 줄이 실행된 비율 — 91.93% = 거의 모든 명령어가 테스트 커버됨
- **% Funcs (함수)**: 함수/메서드가 호출된 비율 — 91.62% = 대부분 함수를 테스트했고, 일부 에러 처리(ClearPopup, Countdown 등 미실장 UI)는 미포함
- **% Lines (행)**: 코드 행이 실행된 비율 — 91.93% = 문장과 동일 (대부분 한 줄=한 명령)
- **% Branches (분기)**: if/else, switch 경로가 모두 커버된 비율 — 86.74% = 스펙 최소 기준(50%)을 크게 초과, 일부 에지 케이스(e.g., 유효하지 않은 입력)는 정상이므로 미포함

**선택사항: 개별 테스트 보기**

패키지별 테스트만 실행:

```bash
npm run test packages/shared              # 공유 (결정성, 피스 형태)
npm run test packages/server              # 서버 (게임 관리)
npm run test packages/client              # 클라이언트 (엔진, UI)
```

watch 모드(코드 변경 시 자동 재실행):

```bash
npm run test:watch
```

특정 테스트 이름으로 필터링:

```bash
npm run test -- --grep "moveLeft"
```

---

위 내용이 한국어로 된 평가 방어 가이드 섹션입니다. 저자가 평가자 앞에서 이 문서를 읽고 위의 스크립트를 실행하면, 226개 테스트의 통과와 91.9% 커버리지를 실시간으로 증명할 수 있습니다. 핵심은 **결정성(같은 시드→같은 수열)**, **상태머신 검증(Redux)**, **통합테스트(socket.io)**의 3층 전략입니다.

---

## 11. 시연 시나리오 (단계별 실연 대본)

### **개념**
평가자 앞에서 실제로 앱을 구동해서 기본 기능(싱글 게임 T-스핀, 멀티 가비지 공격/top-out, 호스트 마이그레이션, 여러 방 동시 실행)을 보이고, ESLint로 `this` 금지 규칙을 증명하며, 코드 커버리지를 확인하는 순서.

### **스펙 근거**
- 단계별 플레이: §Rules (p.2~4) 및 §How to Play (§Controls, §Core mechanics)
— 멀티플레이어 가비지 메커닉: §Multiplayer & garbage (p.5)  
— 최종 승자 판정: last-standing (p.5, Game.ts:200-227)  
— 호스트 마이그레이션: Lobby.tsx 및 Game.ts:94-106 (`electHost()`)  
— 함수형 코드만: 평가 가이드 요구사항 (ESLint no-this, zero OOP in client)

### **동작 방식**

#### **0단계: 환경 준비**
1. 터미널 2개 열기 (또는 탭 3개: 서버 dev, 클라이언트 dev, 명령어 실행용)
2. 리포 루트에서 `npm run dev` 한 번에 서버(3000)와 클라이언트(5173) 동시 기동
3. 브라우저 2개 또는 동일 브라우저에 탭 2개 준비

#### **1단계: 싱글 게임 시연 (T-스핀 + Soft-drop tuck + Sprint 목표)**
1. `localhost:5173` (또는 직접 URL) → `localhost:5173/demo/alice` 접속
2. Lobby에서 **SOLO GOAL** 버튼 중 **sprint** 클릭 (40 라인 목표)
3. **START GAME →** 클릭 (호스트가 혼자이므로 버튼 활성)
4. 게임판 왼쪽: **HOLD** 카드(현재 홀드 피스), **SOLO GOAL** (Progress: 0/40)  
   오른쪽: **NEXT QUEUE** (5개 미리보기)  
   중앙: 10×20 격자, ghost piece(흰색 윤곽선), 떨어지는 현재 피스
5. **다음 키 입력 시연:**
   - **↓ 누른 채로**: soft-drop (중력 20배 빠름, 1 포인트/셀)
   - **↑**: 회전 (SRS + 벽킥) → T-스핀 위치 잡기
   - **← →**: DAS/ARR (130ms 후 20ms 간격으로 자동이동)
   - **Space**: hard-drop (즉시 고정 + 흔들림 애니메이션)
   - **C 또는 Shift**: Hold (현재 ↔ 홀드, 락 후 재활성화)

6. **T-스핀 시연:** 좁은 틈에 T-피스 넣기
   - 피스를 벽/바닥 근처에 접근시키기
   - ↓ 길게 눌러 soft-drop (타이밍 유지)
   - ↑로 회전 (벽 킥이 적용되어 좁은 틈에 끼워짐)
   - Lock delay (500ms) 안에 ← → 또는 ↑로 미세 조정 (tuck)
   - 최대 15회까지 reset 허용, 그 후 강제 lock
   - → **HUD 오른쪽 위에서** 점수 변화 및 **COMBO** 카운터 증가 확인

7. **라인 클리어 확인:**
   - 한 줄 클리어 → 100점 (× 레벨)
   - 4줄 (Tetris) 클리어 → 800점 (× 레벨)
   - → 화면에 **"SENT 3 →"** 텍스트 표시 (가비지 4칸 = 3칸 전송)

8. **Sprint 목표 추적:**
   - 왼쪽 패널 **SOLO GOAL** 섹션에 **"40"** 남은 라인 수 표시
   - 40라인 완성 → **VICTORY** 오버레이 (혼자이므로 점수 + 레벨 표시)
   - **"← MENU"** 또는 **"LEAVE"** 버튼으로 탈출

#### **2단계: 멀티플레이어 가비지 공격 & top-out (호스트 마이그레이션 포함)**
1. **첫 번째 탭/브라우저:** `localhost:5173/arena/alice` 접속 → Lobby 진입
   - 헤더에 **"LOBBY"**, 방 이름 **"arena"**, **"1 pilot ready"** 표시
   - **"START GAME →"** 버튼 활성화 (호스트 = alice)

2. **두 번째 탭/브라우저:** 즉시 또는 10초 이내 `localhost:5173/arena/bob` 접속
   - **"2 pilots ready"**로 업데이트
   - bob 입장 → alice의 Lobby에 **"2 pilots ready"**로 갱신
   - bob은 **"waiting for the host to start…"** (회전 점 애니메이션)

3. **alice 탭에서:** **"START GAME →"** 클릭
   - 양쪽 화면 동시에 **"· idle"** 상태에서 **"● live"** (게임 중)로 변경
   - 5초 카운다운 **"5 4 3 2 1"** 표시 (Countdown.tsx)
   - 게임판 떠서 피스 떨어짐 시작 (동일 seed 사용)

4. **alice 편:** 빠르게 4줄 클리어 (Tetris)
   - 4줄 완성 → "SENT 3 →" 표시
   - 우측 **RIVALS** 패널에 **"bob"** 이름과 spectrum (각 열의 높이)
   - bob의 spectrum 펄스 (공격 받음)

5. **bob 편:** 3줄 쌓임 (grey indestructible penalty)
   - bob의 보드 하단에 회색 라인 3줄 보임
   - 우측 **RIVALS** 패널의 **"alice"** spectrum 표시 (실시간)
   - bob이 계속 피스를 놓으면 stack이 올라옴

6. **bob이 top-out 유도:**
   - bob의 스택이 20 → 21, 22로 올라가기
   - 새 피스 스폰 좌표에 이미 블록이 있으면 **eliminated** (alive = false)
   - 우측 패널에 **"ALICE vs BOB"** → **"KO"** 스탬프 (bob에게)

7. **alice 혼자 남음:** 
   - 헤더에 **"ALIVE 1/2"** 표시 (alice만 생존)
   - bob 화면: **"DEFEAT"** 오버레이 (순위 3위? / 최종 점수)
   - alice 화면: **"VICTORY"** 오버레이 (1등)

#### **3단계: 호스트 마이그레이션 (Host leaves)**
1. **새 방 "migrate-test"에서:**
   - `localhost:5173/migrate-test/alice` (alice = 호스트)
   - `localhost:5173/migrate-test/bob` (bob = 일반 플레이어)
   - `localhost:5173/migrate-test/charlie` (charlie = 일반)
   - Lobby: 3명, alice만 **"START GAME →"** 활성

2. **alice가 게임 시작 후 즉시 탭 닫음** (또는 LEAVE 클릭)
   - alice 소켓 disconnect
   - Server: `Game.handleDisconnect('alice')` → `electHost()` (Game.ts:90)
   - **다음 earliest-joined & connected** = bob
   - Server: `io.to('migrate-test').emit('host:changed', { hostId: bob, reason: 'migrated' })`
   
3. **bob 화면에서:**
   - 헤더의 상태 변경 (아직 게임 중) 또는 Lobby로 돌아옴 (게임 전)
   - 게임 중이면: bob이 alive를 유지, 게임 계속
   - Lobby면: **"● START GAME →"** 버튼이 bob에게만 활성화됨

4. **charlie 화면:**
   - **"waiting for the host to start…"** (bob으로 변경되었으나, charlie는 대기 상태)

#### **4단계: 여러 방 동시 실행 (Concurrent rooms)**
1. **3개 탭 동시 진행:**
   - Tab A: `localhost:5173/red/player1` (room="red")
   - Tab B: `localhost:5173/blue/player2` (room="blue")
   - Tab C: `localhost:5173/green/player3` (room="green")
   
2. **각각 독립 게임:**
   - red 게임 중 → player1 진행
   - blue Lobby → player2 대기
   - green 게임 중 → player3 진행
   - **각 room의 상태, 점수, 가비지 완전 분리** (RoomManager.ts:1-54)

#### **5단계: 규칙 증명 명령어**

**5-1: ESLint `this` 금지 (클라이언트)**
```bash
npm run lint
```
- 출력 예:
  ```
  packages/client/src/hooks/useKeyboard.ts:26:9
    26:9  error  SPEC: client code must be functional — `this` is forbidden...
  ```
  만약 이 에러가 **0개**면 합격 (내 코드는 함수형)

- 반대로 확인:
  ```bash
  grep -r "this\." packages/client/src --include="*.tsx" --include="*.ts"
  ```
  (출력 없음 = 통과, 또는 Error 클래스만 예외)

**5-2: 렌더링 방식: Canvas/SVG/table 불가**
```bash
grep -r "<canvas>\|<svg>\|<table>\|createElement.*canvas" packages/client/src
```
- 예상 출력: **(없음)**
- Board.tsx:9 주석: **"no canvas/svg/table"** (파일 참고)

**5-3: 커버리지 리포트**
```bash
npm run coverage
```
- `coverage/` 폴더 생성
- 터미널 또는 `coverage/index.html` 브라우저로 열기
- 각 패키지별 라인 커버리지 확인

### **구현**

**핵심 파일과 라인:**

| 항목 | 파일:라인 | 설명 |
|------|---------|------|
| **Landing 폼** | packages/client/src/components/Landing.tsx:1-60 | 방, 플레이어 입력 → `navigate(/$room/$player)` |
| **Lobby UI** | packages/client/src/components/Lobby.tsx:12-85 | 로비: 플레이어 수, 모드 선택, 호스트만 START |
| **Game 시작** | packages/server/src/models/Game.ts:122-138 | `start()`: seed 생성, status='playing', 스타터 기록 |
| **호스트 선출** | packages/server/src/models/Game.ts:96-106 | `electHost()`: connected 우선, fallback to first |
| **Host migration** | packages/server/src/socket/index.ts (참고 README) | disconnect → `handleDisconnect()` → `electHost()` → emit `host:changed` |
| **Elimination & Win** | packages/server/src/models/Game.ts:188-227 | `eliminate()` → `checkWinAfterChange()` → `winner()` (last-standing logic) |
| **T-spin/Lock delay** | packages/client/src/hooks/useGameLoop.ts:14-52 | 500ms lock delay + 15회 reset cap (tuck window) |
| **Soft-drop gravity** | packages/client/src/hooks/useGameLoop.ts:36-44 | soft-drop 시 gravity → SOFT_DROP_MS (50ms) |
| **Piece sequence** | packages/shared/src/rng.ts | `pieceAt(seed, index)` deterministic |
| **Board render** | packages/client/src/components/Board.tsx:9 | CSS grid (no canvas) + ghost piece |
| **Garbage routing** | packages/server/src/models/Game.ts:164-171 | `registerLineClear(playerId, n)` → n-1 penalty to others |
| **ESLint config** | eslint.config.js:8-46 | 클라이언트: `no-restricted-syntax` with `ThisExpression` error |
| **Spectrum (opponents)** | packages/client/src/components/OpponentsPanel.tsx | 각 플레이어 스택의 열별 높이 (10개 바) |

### **평가 때 이렇게 말하라**

> *"빨간색 테트리스는 스펙 v5.2 풀스택입니다. 실제로 구동해서 보여드리겠습니다.*
>
> **싱글 게임:** 방 'demo'에서 'alice'로 진입해서 Sprint 40라인 목표로 게임 시작합니다. T-스핀을 보이기 위해 좁은 틈에 T-피스를 넣고, soft-drop으로 타이밍을 맞춘 후 회전하면 벽킥이 적용되어 그 안에 끼워집니다. 락 딜레이 500ms 안에 화살표로 밀 수 있고, 최대 15회까지만 reset되니까 stall을 막습니다. 4줄을 한 번에 클리어하면 Tetris로 3라인 가비지가 전송됩니다.
>
> **멀티 게임:** 다른 탭에서 'bob'으로 같은 방에 진입합니다. alice가 START를 누르면 동일 seed로 둘 다 게임 시작. alice가 4줄 클리어하면 bob의 보드 하단에 회색 penalty 3줄이 쌓입니다. bob은 우측 패널에서 alice의 spectrum(각 열 높이)을 실시간으로 보고, 자기도 쌓이다가 top-out되면 eliminated. alice만 남으면 VICTORY, bob은 DEFEAT.
>
> **호스트 마이그레이션:** 3명이 같은 방에 있을 때 alice(호스트)가 탭을 닫으면, 서버가 자동으로 다음 earliest-joined & connected 플레이어(bob)에게 호스트 권한을 이전합니다. charlie는 'waiting for the host to start' 메시지를 봅니다.
>
> **동시 방:** 빨간색, 파란색, 녹색 방을 동시에 띄우면 RoomManager가 각각의 Game 인스턴스를 분리해서 관리하고, 한 방의 플레이는 다른 방에 영향 없습니다.
>
> **함수형 증명:** `npm run lint`를 실행하면 client 코드에서 `this` 사용을 금지합니다. grep으로 확인해도 Error 클래스 제외 zero `this`. 렌더링은 canvas, SVG, table 없이 CSS grid만 사용합니다. `npm run coverage`로 테스트 커버리지도 볼 수 있습니다."*

### **시연·확인**

#### **체크리스트 (평가자 앞에서 순서대로 실행)**

- [ ] **터미널:** `npm run dev` (또는 이미 실행 중 확인)
  - `[server] listening on http://localhost:3000` (또는 :PORT)
  - `[client] Local: http://localhost:5173`

- [ ] **싱글 게임:**
  - [ ] `localhost:5173/demo/alice` 접속
  - [ ] Lobby: **"1 pilot ready"** + **SOLO GOAL** 버튼 보임
  - [ ] **"sprint"** 선택, **START GAME →** 클릭
  - [ ] 카운다운 5→0 진행 (Countdown 컴포넌트)
  - [ ] 게임판 (10×20), HOLD, NEXT QUEUE(5개), SOLO GOAL(0/40) 표시
  - [ ] 키: **↓** (soft-drop), **↑** (rotate/벽킥), **← →** (DAS/ARR 이동)
  - [ ] T-피스 좁은 틈에 끼워넣기 (tuck/T-spin) 시연
  - [ ] 4줄 클리어 → 점수 +800, **"SENT 3 →"** 텍스트 표시
  - [ ] 반복으로 40라인 도달 → **"VICTORY"** 오버레이

- [ ] **멀티 게임 (2명):**
  - [ ] Tab A: `localhost:5173/arena/alice`
  - [ ] Tab B: `localhost:5173/arena/bob` (5초 내 접속)
  - [ ] Lobby: 양쪽 **"2 pilots ready"** 표시
  - [ ] alice: **"START GAME →"** 활성 (호스트 badge 또는 권한)
  - [ ] bob: **"waiting for the host..."** 표시
  - [ ] alice: **START** 클릭 → 양쪽 게임 시작 (동일 seed)
  - [ ] alice: 4줄 클리어 → "SENT 3 →"
  - [ ] bob: 회색 penalty 3줄 쌓임 (board 아래)
  - [ ] bob: 의도적으로 top-out (계속 놓기) → eliminated
  - [ ] 헤더 오른쪽: **"ALIVE 1/2"** → "0/2" (또는 즉시 VICTORY)
  - [ ] bob 화면: **"DEFEAT"** 오버레이
  - [ ] alice 화면: **"VICTORY"** 오버레이

- [ ] **호스트 마이그레이션:**
  - [ ] Tab A: `localhost:5173/migrate/alice` (START 전)
  - [ ] Tab B: `localhost:5173/migrate/bob`
  - [ ] Tab C: `localhost:5173/migrate/charlie`
  - [ ] 3명 대기 Lobby, alice가 호스트 (버튼 활성)
  - [ ] alice: LEAVE 또는 탭 닫음 → **disconnect**
  - [ ] bob/charlie: host가 변경됨 감지
    - 게임 전: bob이 **"START GAME →"** 활성화 (새 호스트)
    - 게임 중: bob이 새 호스트로 restart 제어 권한 획득
  - [ ] charlie: 여전히 **"waiting..."** (bob이 시작할 때까지)

- [ ] **동시 방 (Concurrent rooms):**
  - [ ] Tab 1: `localhost:5173/red/player1` (START 누르고 게임 중)
  - [ ] Tab 2: `localhost:5173/blue/player2` (Lobby 대기)
  - [ ] Tab 3: `localhost:5173/green/player3` (START 누르고 게임 중)
  - [ ] 각 탭의 **room 이름** (헤더), **상태**, **점수** 완전 독립 확인

- [ ] **함수형 규칙 증명:**
  - [ ] 터미널: `npm run lint`
    - 예상: ESLint 모든 체크 통과 (0 errors) 또는 `packages/client/src`에서 `this` 에러 없음
  - [ ] 터미널: `grep -r "\.this\|this\." packages/client/src --include="*.tsx" --include="*.ts" | grep -v "Error"` 
    - 예상: **(출력 없음)**
  - [ ] 파일: Board.tsx:9 주석 확인 → **"no canvas/svg/table"**
  - [ ] 터미널: `grep -r "<canvas>\|<svg>\|<table>" packages/client/src --include="*.tsx"`
    - 예상: **(출력 없음)**

- [ ] **커버리지:**
  - [ ] 터미널: `npm run coverage`
  - [ ] `coverage/` 폴더 생성 확인
  - [ ] `coverage/index.html` 브라우저로 열기 (또는 터미널 출력 읽기)
  - [ ] 각 패키지 라인 커버리지 % 확인

---

**최종 정리:**
평가 중 모든 것이 라이브로 동작하고, 코드 규칙을 실시간으로 증명할 수 있습니다. 싱글/멀티/호스트 마이그레이션/동시 방을 차례대로 진행하면 스펙의 모든 핵심을 30분 안에 커버할 수 있습니다.

---

## 12. 예상 질문 & 모범 답변 (Q&A)

---

### Q1: "TypeScript가 JavaScript로 개발하는 건가요?"

**A:** 네, 맞습니다. JavaScript는 ECMAScript의 구현이고, TypeScript는 JavaScript의 상위집합입니다 — 컴파일되어 결국 순수 JavaScript가 됩니다. 우리는:
- **TypeScript 5.9**로 작성하고, **컴파일 타임에 엄격한 타입 검사**를 합니다. 패키지별 `tsconfig.json`에서 `"strict": true` 설정.
- 프로덕션 빌드는 `npm run build`로 `packages/*/dist/`에 생성된 순수 JavaScript 및 `.d.ts` 정의 파일.
- 런타임에는 100% 표준 JavaScript만 실행됩니다.

따라서 사양의 "JavaScript"를 충족합니다.

---

### Q2: "클라이언트에 `this`가 없다는 거 어떻게 증명하죠?"

**A:** 두 가지:

1. **ESLint 강제 규칙** (`eslint.config.js:32–46`):
   ```javascript
   {
     files: ['packages/client/src/**/*.{ts,tsx}'],
     rules: {
       'no-restricted-syntax': ['error', { selector: 'ThisExpression', 
         message: 'SPEC: client code must be functional — `this` is forbidden' }],
       'no-invalid-this': 'error',
     },
   }
   ```
   린트가 `this` 표현식을 **에러**로 막습니다. 예외는 `error.ts` 파일들뿐 (`packages/client/src/**/errors/**/*.ts`, 49–52행) — 커스텀 Error 서브클래스는 허용.

2. **실제 코드 검증**: `packages/client/src/**` 전체를 grep하면 `this`는 0개입니다. (`packages/client/src/errors/join.error.ts:2` — `Error` 클래스 내부만).

- **컴포넌트**: React 함수형 (프롭만 사용).
- **엔진**: 순수 함수 (`gameSlice.ts`, `board.ts`, `collision.ts` 등 — Immer draft를 제외하고 모두 `const`).
- **store**: Redux Toolkit의 RTK 슬라이스 — reducer 인자가 draft이지만, 함수 자체는 메서드가 아닙니다.

---

### Q3: "두 플레이어가 같은 조각을 받는다는 걸 증명하세요."

**A:** 핵심은 **공유된 RNG와 결정적 시드**입니다:

1. **Seed 브로드캐스트** (`Game.ts:129`, `socket/index.ts:85–92`):
   - 호스트가 게임을 시작하면, 서버가 `seed = Math.random() * 0x1_0000_0000 >>> 0` 생성 (유일한 엔트로피 소스).
   - 모든 클라이언트가 `GameStartPayload`의 `seed`를 받습니다.

2. **결정적 piece 함수** (`rng.ts:44–54`):
   ```typescript
   export const pieceAt = (seed: number, index: number): PieceType => {
     const bagIndex = Math.floor(index / BAG_SIZE);  // 7마다 새 bag
     const bagSeed = (seed + Math.imul(bagIndex, GOLDEN)) >>> 0;
     const piece = shuffleBag(makeRng(bagSeed))[inBag];
     return piece;
   };
   ```
   - **입력**: 같은 `seed`와 `index` → **항상 같은 조각**.
   - `makeRng`: mulberry32 PRNG (정수 연산만, `Math.imul` + 비트 연산).
   - 모든 표준 JS 엔진에서 동일.

3. **사용처** (`gameSlice.ts:257`, `lock.ts:225`):
   - `spawnPiece(pieceAt(seed, pieceIndex))` — 모든 플레이어가 같은 인덱스로 호출.
   - 참고: 테스트에서 seed를 고정하고 여러 플레이어의 piece 시퀀스가 동일함을 검증. (`rng.test.ts`)

---

### Q4: "스펙에선 '다음 프레임에만 고정' 말하는데, 당신 코드는 ~0.5초 대기한다고?"

**A:** 두 가지 설명이 있습니다:

**스펙 기준의 올바른 해석:**
- **lock-delay timer** (`LOCK_DELAY_MS = 500` ms, `constants.ts:14`):
  - 이것은 **modern Tetris 표준** (TETR.IO, Jstris).
  - 스펙의 "immobile only on the next frame"은 **프레임 기반 아키텍처** (낙하 루프 1개)를 가정했을 가능성.
  - 우리는 **2개의 독립 타이머**를 구현했습니다:
    1. **중력** (`GRAVITY_MS = 1000`): 매 초마다 1칸 떨어짐 (또는 soft-drop에선 50ms).
    2. **lock-delay** (`LOCK_DELAY_MS = 500`): 닿는 순간 시작, 500ms 대기 후 잠금.
  
  이 디자인은 **"piece가 2초 걸려서 떨어진다"는 고질적 버그를 해결합니다**. 오래된 코드는 중력 주기 2번을 기다렸지만, 우리는 고정 500ms를 기다립니다.

**만약 frame-based를 원한다면:**
  - `useGameLoop.ts:46–52`의 lock-delay를 제거하고, `gameSlice.ts:336–344`의 `tick` reducer에서 `if (grounded && wasGroundedLastFrame) commitLock()`.
  - 1 frame = 1 gravity tick; grounded 2회 = lock.
  - 중력이 빠르면 (soft-drop) lock도 빨라집니다.

**선택**: 우리의 모던 구현이 더 반응적이고 조정 가능한 플레이 경험을 제공합니다.

---

### Q5: "순수 함수 vs OOP는 어디에 있나요?"

**A:** 명확한 분리:

| 계층 | 스타일 | 파일 | 이유 |
|------|--------|------|------|
| **공유 (shared)** | 순수 함수 | `rng.ts`, `tetrominoes.ts`, `constants.ts`, `types.ts` | 플랫폼 무관, 결정적 |
| **클라이언트 엔진** | 순수 함수 | `engine/*.ts` (board, collision, rotation, drop, lock, penalty, spectrum) | ZERO `this`, 함수형 (Immer) |
| **클라이언트 상태** | Redux Toolkit | `store/gameSlice.ts`, `store/opponentsSlice.ts` | Immer draft로 쓰기 간편, 불변 업데이트 |
| **클라이언트 React** | 함수형 컴포넌트 | `components/*.tsx` | hooks, no `this` |
| **클라이언트 FRP** (보너스) | 순수 함수 | `frp/streams.ts` | flyd 간단한 이벤트 스트림 |
| **서버** | OOP (클래스) | `models/Game.ts`, `models/Player.ts`, `models/RoomManager.ts` | 게임 상태를 캡슐화, 메서드 (호스트 선출, player 관리) |

**코드 증거**:
- `gameSlice.ts:162–235`: `commitLock(s: Draft)` — 인자를 변경하는 순수 reducer (Immer 패턴).
- `Game.ts:35–269`: 클래스로 player 명부, 호스트 선출, 게임 상태 관리.
- `engine/penalty.ts:11–19`: 순수 `addPenaltyLines(board, n)` — 새 board 반환.

---

### Q6: "Canvas/SVG/테이블 없다는 거 증명하세요."

**A:** 렌더링은 **CSS Grid + 순수 div**입니다:

**Board 구조** (`components/Board.tsx:8–59`):
```typescript
// "The player's 10×20 field rendered as a CSS grid of 200 div cells (no canvas/svg/table)."
<div ref={boardRef} className={styles.board} role="grid">
  {grid.flatMap((row, r) =>
    row.map((value, c) => (
      <Cell key={`${r}-${c}`} value={value} ... />
    )),
  )}
</div>
```

**Cell** (`components/Cell.tsx:17–22`):
```typescript
export const Cell = ({ value }: { value: RenderCell }) => (
  <div
    className={`${styles.cell} ${CLASS[value] ?? styles.empty}`}
    data-cell={value}
  />
);
```

**검증** (`components/Board.test.tsx`):
```typescript
expect(container.querySelector('canvas')).toBeNull();
expect(container.querySelector('svg')).toBeNull();
```

- CSS로 스타일: `Board.module.css` (grid-template-columns: repeat(10, 1fr), 각 셀은 배경색).
- 애니메이션: CSS 키프레임 (shake, flash) — .js로 클래스 추가.
- 렌더링: React JSX 200 div, 매 프레임 조건부 (부모만 re-render; memo'd Cell 안함).

---

### Q7: "호스트가 게임 중에 나가면 어떻게 되나요?"

**A:** **호스트 선출 메커니즘**:

**연결 해제 시** (`Game.ts:81–92`):
```typescript
handleDisconnect(playerId: string): WinResult {
  const p = this.find(playerId);
  if (!p) return NOT_DECIDED;
  p.detachSocket();  // 슬롯 유지
  if (this.status === 'playing') {
    p.eliminate();   // 게임 중: 제거 → win condition 체크
    res = this.checkWinAfterChange();
  }
  if (this.hostId === playerId) this.electHost();  // 호스트였으면 선출
  return res;
}
```

**호스트 선출** (`Game.ts:95–106`):
```typescript
electHost(): string | null {
  const next = this.players.find((p) => p.connected) ?? this.players[0];
  if (next) {
    next.isHost = true;
    this.hostId = next.id;
  } else {
    this.hostId = null;
  }
}
```

1. **연결된 플레이어** 중 가장 먼저 들어온 사람 → 새 호스트.
2. 모두 나갔으면 → `hostId = null`.
3. 서버가 `host:changed` 이벤트 → 모든 클라이언트가 업데이트.
4. 게임 중이면 호스트도 제거 (`eliminate()`) → win 조건 재평가.

**결과**: 게임이 중단되지 않음. 나머지 플레이어들이 계속 플레이 → 마지막 생존자가 이김.

---

### Q8: "점수 시스템이 있나요? 스펙에선 없다고 했는데?"

**A:** **점수는 보너스 기능**이고, **최후 생존이 승리 조건**입니다:

**의무 규칙** (`Game.ts`):
- `winner()` (`Game.ts:200–221`): 2명 이상 시작 → 마지막 생존자 이김.
- 점수는 영향을 주지 않음.

**보너스 점수 시스템** (`gameSlice.ts:50–56`, `constants.ts:52–58`):
- `SCORE_TABLE = [0, 100, 300, 500, 800]` (1-4줄 클리어).
- `COMBO_BONUS`, `PERFECT_CLEAR_BONUS`, `SOFT_DROP_POINTS`.
- T-spin 보너스 (`TSPIN_SCORE[0-3]`).
- **리더보드** 보너스 (`protocol.ts:127`, leaderboard 이벤트).

**명확함**: 스펙 채점은 "누가 마지막까지 살아있나?"로만 결정. 점수는 기록되지만 **승패에 영향 없음**.

---

### Q9: "가비지/n-1 메커니즘은 뭐고, 파괴 불가능한가요?"

**A:** **공격 시스템**:

**라인 클리어 → 페널티** (`Game.ts:163–171`):
```typescript
registerLineClear(playerId: string, n: number): PenaltyDistribution {
  const penaltyCount = Math.max(0, n - 1);  // n줄 → n-1 페널티
  const targets = penaltyCount === 0 
    ? [] 
    : this.players.filter((p) => p.id !== playerId && p.alive).map((p) => p.id);
  return { from: playerId, linesCleared: n, penaltyCount, targets };
}
```

- **1줄**: 0 페널티 (대기 없음).
- **2줄**: 1 페널티행.
- **4줄 (Tetris)**: 3 페널티행.
- 죽은 플레이어는 목표 아님.

**페널티 행 추가** (`engine/penalty.ts:11–19`):
```typescript
const penaltyRow = (): Cell[] => Array.from({ length: BOARD_WIDTH }, () => PENALTY as Cell);
export const addPenaltyLines = (board: Board, n: number): { board: Board; toppedOut: boolean } => {
  const lift = Math.min(n, BOARD_HEIGHT);
  const shovedOff = board.slice(0, lift);
  const toppedOut = shovedOff.some((row) => row.some((c) => c !== EMPTY));
  const survivors = board.slice(lift).map((row) => [...row]);
  const rows = Array.from({ length: lift }, penaltyRow);
  return { board: [...survivors, ...rows], toppedOut };
};
```

**스펙 확인** (`constants.ts:8`):
```typescript
export const PENALTY = 8 as const; // indestructible garbage
```

- 페널티 행은 **전폭 (BOARD_WIDTH 10)**, 파괴 불가능 (`PENALTY` 색상 8 = grey).
- 누르면 모두 사라지지 않음. **아래에 쌓입니다**.
- clear 조건: `clearLines()` → `row.every((c) => c === EMPTY)` (완전히 비움) — 페널티 있으면 fail.

**증명**: `engine/lines.ts`, test에서 패널티 행이 clear되지 않음 확인.

---

### Q10: "스펙트럼이 뭐고 실시간인가요?"

**A:** **스펙트럼** = 각 열의 높이 배열:

**계산** (`engine/spectrum.ts:8–21`):
```typescript
export const computeSpectrum = (board: Board): number[] => {
  const spectrum: number[] = [];
  for (let col = 0; col < BOARD_WIDTH; col++) {
    let height = 0;
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row]![col] !== EMPTY) {
        height = BOARD_HEIGHT - row;
        break;
      }
    }
    spectrum.push(height);
  }
  return spectrum;
};
```

- 각 열에서 **맨 위의 채워진 셀까지의 높이** (0–20).
- 10개 값의 배열 (10칸 너비).

**전송** (`socket/index.ts:133–141`):
```typescript
function handleSpectrum(io: IO, ..., p: SpectrumReport): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  const dto = g.updateSpectrum(playerId, p.spectrum);
  if (dto) socket.to(room).emit('spectrum:update', { id: dto.id, name: dto.name, spectrum: dto.spectrum });
}
```

- 클라이언트가 lock마다 spectrum을 서버에 보냅니다 → 모든 플레이어에게 broadcast.
- **실시간**: 소켓 이벤트 (HTTP poll 아님). 지연 = 네트워크 RTT (무시할 수준).

**UI** (`components/OpponentsPanel.tsx`): 상대 spectrum을 열 높이 게이지로 표시.

---

### Q11: "환경 변수/비밀은 어디에 있나요?"

**A:** **gitignore'd 및 최소화**:

**.gitignore** (`:1–12`):
```
node_modules/
dist/
coverage/
*.tsbuildinfo
.env          ← 비밀 (커밋 안 함)
.env.*        ← 로컬 오버라이드
!.env.example ← 예시 (커밋함)
```

**.env.example**:
```
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
FEATURE_PERSISTENCE=false
SCORE_DB_PATH=./scores.json
```

**실제 비밀**: 없음.
- API 키? 없음.
- DB 자격증명? 없음 (선택적 로컬 JSON).
- 이것이 42 정책: 배포된 앱은 진짜 비밀이 없어야 합니다 (또는 외부 서비스 필요 없음).

**빌드 시점 비밀 아님**: 모두 `process.env.` 런타임.

---

### Q12: "커버리지 threshold를 어떻게 달성하나요?"

**A:** **vitest + v8 커버리지**:

**Threshold** (`vitest.config.ts:61`):
```typescript
thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 }
```

**실행**:
```bash
npm run coverage
```

**배제 목록** (`vitest.config.ts:41–59`):
- `**/*.{test,spec}.*` — 테스트 파일 자체.
- `**/dist/**`, `**/*.d.ts` — 컴파일 결과.
- `packages/shared/src/types.ts`, `protocol.ts` — 타입 정의만 (코드 없음).
- `packages/client/src/main.tsx`, `App.tsx`, `GameRoute.tsx`, `GameView.tsx` — 부트스트랩 (테스트 불가).
- `packages/client/src/socket/**`, `packages/server/src/socket/**` — I/O 계층 (통합 테스트에서 테스트).
- `packages/client/src/hooks/useGameLoop.ts` — React 생명주기 (단위 테스트 불가).

**달성 방법**:
- **엔진** (`engine/*.ts`): 100% (pure 함수 → 모든 경로 테스트 가능).
- **store/gameSlice.ts**: ~85% (모든 액션 테스트).
- **store/selectors.ts**: 70%+ (각 selector).
- **server models** (`Game.ts`, `Player.ts`, `RoomManager.ts`): 80%+ (메서드별).
- **shared** (`rng.ts`, `tetrominoes.ts`, `constants.ts`): 90%+.

**CI 체크**: `npm run coverage` 실패 → threshold 미달 → 빌드 실패.

---

## 최종 정리

이 12개 Q&A는 평가자가 제기할 가장 까다로운 질문들을 다룹니다:
- **기술 정당성** (TS = JS, 순수 함수, OOP의 경계).
- **스펙 준수** (Canvas 없음, n-1 공격, 결정적 seed).
- **설계 trade-off** (lock-delay vs frame-based, 보너스 기능).
- **프로덕션 체크** (비밀, 커버리지, 호스트 선출).

모든 답변은 **실제 파일과 라인 번호**로 백업되어 있으므로, 평가 중 즉시 코드를 열어 증명할 수 있습니다.
