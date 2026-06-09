# Red Tetris — 평가 가이드 (Evaluation Guide)

> 42 **Red Tetris (v5.2)** 동료 평가에서 **바로 펼쳐 쓰는 1~2페이지 치트시트**.
> 상세 코드 설명은 코드 자체와 `README.md`를 참고하세요.

## 30초 소개
> "Full-Stack JavaScript(TypeScript)로 만든 온라인 멀티플레이 Tetris입니다. **클라이언트는 `this` 없이 순수 함수 엔진 + React/Redux**, **서버는 Player·Piece·Game 클래스 기반 OOP**예요. 서버가 seed 하나만 뿌리면 모든 클라이언트가 7-bag으로 **똑같은 조각 순서**를 계산합니다(결정론). 라인을 지우면 상대에게 **n-1 불멸 라인**이 가고, **마지막 한 명**이 이깁니다. Canvas/SVG/table 없이 전부 CSS grid div로 그리고, 테스트 커버리지는 90%대입니다. 보너스도 다 했어요. 바로 보여드릴게요."

---

## 1. 실행 & 즉석 증명 (평가자 앞에서 이 명령들)

```bash
npm install
npm run build && npm start     # 프로덕션: 서버(:3000)가 빌드된 SPA를 서빙 (평가 권장)
#  또는  npm run dev           # 개발: client :5173 + server :3000

# 접속 (두 형식 모두 동작):
#   http://localhost:3000/<room>/<player>      예: localhost:3000/neon/alice
#   http://localhost:3000/#<room>[<player>]    예: localhost:3000/#neon[alice]

npm run lint        # 클린 → 클라이언트 'this' 금지 규칙(ESLint) 통과
npm test            # 231 passed
npm run coverage    # 91.5/86.6/91.4/91.5  (게이트: stmts/funcs/lines ≥70, branch ≥50)

# 금지 기술 0건 증명:
grep -rniE "<canvas|<svg|<table|jquery" packages/client/src   # → 0건
# socket.io가 미들웨어 한 곳에만 있다는 증명:
grep -rl "socket\.\(on\|emit\)" packages/client/src           # → socket/middleware.ts 만
```

---

## 2. 공식 평가표(Scale) 항목 → 충족 근거

| 평가표 항목 | 충족 근거 (위치) | 시연 |
|---|---|---|
| 솔로 실행 (URL이 doc에 충실) | 경로·해시 URL 둘 다 (`HashRedirect`, `hashRoute.ts`) | 두 URL 입력 |
| 멀티 실행 (첫 명만 시작·진행중 입장불가·1명 남으면 종료) | `Game.start`(host), `JOIN_AFTER_START`, `Game.winner()` | 2 브라우저 |
| 재시작 (**우승자**가 재시작·종료 후~재시작 전 신규 입장 가능) | 우승자→host 승격 `Game.checkWinAfterChange`, join 게이트 `status !== 'playing'` | 우승자가 **PLAY AGAIN** |
| 블록 분배 (동일 시퀀스·좌표) | `pieceAt(seed, i)` 7-bag (`shared/rng.ts`) | 두 화면 NEXT 비교 |
| 블록 이동 (착지 후 tick 중 이동, 강제낙하 제외) | 입력 4종 + 500ms lock delay (`useGameLoop`) | tuck / T-spin |
| 라인 주입 (n-1 불멸 하단) | `Game.registerLineClear` → `penalty:apply`, `PENALTY` 행 | 라인클리어 |
| HTML/DOM (flexbox·grid, no canvas/svg/table/jquery) | CSS grid div (`Board.tsx`) | grep 0건 |
| 스펙터 (이름 + 실루엣, 실시간) | `spectrum:update` (`engine/spectrum.ts`, `opponentsSlice`) | RIVALS 패널 |
| socket.io 미들웨어 완전 캡슐화 | `socket.on/emit`은 `socket/middleware.ts`만 | grep |
| 함수형 (`this` 금지, 블록 로직 순수) | ESLint `ThisExpression` 차단 (`eslint.config.js`) | npm run lint |
| OOP (게임·플레이어 관리) | `Player·Piece·Game·RoomManager` (`server/models`) | 코드 |
| 커버리지 ≥70/50 | 91%대 | npm run coverage |
| 보너스 (필수가 PERFECT일 때만) | 점수·영속화·모드·FRP·솔로목표 | §4 데모 |

---

## 3. 시연 대본 (순서대로)

**솔로** — `localhost:3000/neon/alice`
1. NEXT 5큐 / HOLD(C) / 고스트 보여주기
2. ↓로 바닥에 붙인 뒤 ← →로 **끼워넣기(tuck)**, T자 슬롯에 ↑회전으로 **T-spin** → 팝업
3. 로비에서 **SOLO GOAL = Sprint** 선택 → 타임어택 시계 / `X/40`

**멀티** — 2번째 탭 `localhost:3000/neon/bob`
4. "2 pilots ready" → 호스트(alice) **START GAME**
5. 우측 RIVALS에 상대 **스펙트럼** 실시간 갱신 확인
6. 라인 클리어 → 상대 하단에 **회색 불멸 가비지** 솟음 (테트리스=3줄)
7. 한 명 탑아웃 → 남은 1명 **VICTORY** (순위표)

**엣지**
8. 게임 끝난 뒤 3번째 탭 `localhost:3000/neon/carol` 입장 → **로비에서 대기**(종료 후 입장 가능)
9. 호스트 탭 닫기 → 다른 플레이어로 **호스트 승계**
10. 해시 URL `localhost:3000/#neon2[dave]` → 같은 게임 실행

---

## 4. 핵심 설계 한눈

| 영역 | 위치 | 한 줄 |
|---|---|---|
| 결정론 | `shared/rng.ts` `pieceAt`, seed `Game.ts:129` | seed 1개 → 7-bag → 모두 동일 조각 (서버의 유일 엔트로피) |
| 순수 엔진 / 무 `this` | `client/engine/*`, `eslint.config.js` | 보드·조각 로직 = 순수 함수, `this`는 `JoinError`만 예외 |
| 서버 OOP | `server/models/{Player,Piece,Game,RoomManager}.ts` | 명단·호스트·승패·페널티 라우팅·다중 방 |
| socket 캡슐화 | `client/socket/middleware.ts` | 인바운드(`on`)+아웃바운드(`emit`) 단 한 곳, 컴포넌트는 Redux만 |
| 가비지 | `Game.registerLineClear` | n줄 클리어 → 상대에 n-1 불멸 라인 |
| 스펙트럼 | `engine/spectrum.ts`, `opponentsSlice` | 각 열 최고 높이, 매 lock마다 브로드캐스트 |
| 렌더 | `components/Board.tsx` + CSS modules | 200개 div grid, no canvas/svg/table |
| 리액티브/FRP | `frp/streams.ts`(flyd), `useGameLoop`, `useKeyboard` | 중력 루프 + 입력 스트림 |
| lock delay | `useGameLoop` `LOCK_DELAY_MS=500` | 착지 후 0.5초 조정 창, 이동/회전마다 재시작(최대 15) |
| 승패 | `Game.winner()` | last-standing / solo-end / everyone-left |
| 보너스 | 점수 `gameSlice` · 영속화 `server/persistence/scoreStore.ts` · 모드 invisible/rising · 솔로 Sprint/Marathon | 승패엔 영향 없음(마지막 생존자 불변) |

---

## 5. 예상 질문 → 한 줄 답변

- **"TS가 JS 맞나?"** → TS는 JS의 상위집합, 빌드하면 순수 JS(`dist/`). 런타임 100% JS.
- **"`this` 없는 거 증명?"** → `npm run lint` (ESLint가 클라이언트 `ThisExpression`을 에러로 차단). 예외는 `JoinError` 하나.
- **"같은 조각 받는 거 증명?"** → 서버 seed 1개 → `pieceAt(seed, i)`는 순수 함수라 같은 입력=같은 출력. `rng.test.ts`가 두 클라 동일 시퀀스 검증.
- **"'다음 프레임' 고정이라는데 0.5초 기다린다?"** → 평가표 5번이 *"착지 후 tick 중 이동 가능(강제낙하 제외)"* 이라 우리 500ms lock delay와 일치 → **통과**. (원하면 1프레임 grace로 되돌릴 수 있음: `useGameLoop`의 lock 타이머)
- **"점수 있는데? 스펙은 점수 없음인데"** → 점수는 **보너스**. 승패는 항상 **마지막 생존자**(`Game.winner()`)라 mandatory 규칙은 그대로.
- **"가비지가 불멸 맞나?"** → `PENALTY` 셀로 하단 추가, 라인 클리어로 안 지워짐. n줄 → n-1.
- **"호스트 나가면?"** → `Game.electHost()`가 가장 먼저 들어온 연결된 플레이어로 자동 승계.
- **"재시작은 누가?"** → 게임 종료 시 **우승자가 host로 승격**(`Game.checkWinAfterChange`)되어 **PLAY AGAIN**을 소유. 평가표 *"only the top player of the game can relaunch"* 충족 (방을 만든 사람이 아니라 그 라운드 승자).
- **"socket을 미들웨어에 캡슐화했나?"** → `socket.on/emit`을 호출하는 파일은 `socket/middleware.ts` 하나뿐(grep으로 증명). 컴포넌트·훅은 Redux 액션만 dispatch.
- **"비밀/.env는?"** → `.env`는 gitignore, 리포엔 placeholder `.env.example`만. 커밋된 비밀 0.
- **"커버리지 어떻게 맞췄나?"** → `npm run coverage` → 4지표 모두 임계 초과(91%대).

---

## 6. 한 줄 요약
필수 전 항목 + 금지 전부 준수 + 보너스 4종, 공식 평가표 13개 항목 모두 충족(해시 URL·socket 캡슐화·종료 후 입장 포함). 프로덕션(`npm start`)·2-브라우저 멀티 라이브 검증 완료.
