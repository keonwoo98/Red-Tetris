# Red Tetris — UI/UX Redesign Spec (Single Source of Truth)

> Grounded in the **actual current code** (`packages/client/src/`), not the stale audit. Reality checks already in place: `NextQueue` already renders 5 slots with first-slot taper; `HoldPiece` already exists with cooldown dimming (`opacity:.4`); `ScoreHUD` has SCORE/LINES/LEVEL; `PiecePreview` is a shared 4×4 mini-grid; piece `COLOR_HEX` is already canonical (I-cyan, O-yellow, T-purple, S-green, Z-red, J-blue, L-orange) and penalty=`8` is gray hatched, ghost=`9`. So this spec does **not** "add a 5-queue" — it focuses on the *real* gaps: **layout geography, opponent mini-wells, garbage meter, countdown, juice (hard-drop/lock/per-row clear), combo/B2B/clear-text, and survival-first results.** All within div+CSS, opponents = name+spectrum[10], React functional.

---

## 1. Design North Star

**"A calm, near-black well at dead center that you trust — surrounded by lightweight neon satellites that only flare when something happens."** The board is the one framed, bright, high-contrast object; everything else (hold, stats, next, rivals) is transparent and quiet until an *event* (lock, clear, hard-drop, attack, KO) makes it flash. The current build's weakness is that **everything glows all the time** (every cell has `0 0 11px` ambient glow, the sidebar is an opaque slab equal in weight to the board), so events can't pop. We fix the signal-to-noise ratio: dim the ambient, reserve glow/shake/flash for events, and make multiplayer legible as a *fight* (who's drowning, who just hit whom, who's left).

**Palette — keep the existing tokens, add a few semantic ones** (append to `theme.css :root`):
```css
--well: #06060d;                /* the recessed play well, darker than --bg */
--well-line: rgba(150,160,220,.06);
--danger: #ff2e4d;              /* = --red, alias for threat semantics */
--warn:   #ff7a2e;              /* orange, mid threat */
--caution:#ffc23d;             /* amber, low-mid threat */
--safe:   #1fe7ff;              /* = --cyan, calm */
--gold:   #ffd24a;              /* winner / #1 */
--ko:     #ff2e4d;
--attack-out: #ff5a78;          /* outgoing garbage tracer */
```
**Type:** keep Chakra Petch (display/HUD labels), JetBrains Mono (numbers, `tabular-nums`), Press Start 2P — but **extend Press Start 2P into play**: use it for the **countdown numerals, the clear-text popups (TETRIS/COMBO/KO), and the results verdict**, so the arcade identity carries past the logo. Re-rank the type scale so the **hero numeral is survival-relevant** (placement / ALIVE count / combo), and **demote SCORE** to a small cosmetic stat (spec: score never wins).

**Ambient tuning (the single highest-polish-per-line change):** reduce per-cell glow from `0 0 11px` → `0 0 4px` (or move it to a settled vs. active distinction), and scope `body::before/::after` blueprint+scanline so it's masked away *behind the board* (it currently adds noise under the busiest element).

---

## 2. New GameView Layout — 3-Column Arena

Replace the current `flex` "board + one fat right sidebar" with a **CSS grid, board-as-hero, symmetric rails**. Hold + stats move LEFT (Tetris muscle memory); Next + Rivals stay RIGHT; Controls demoted to a `<details>` footer.

```
┌───────────────────────── HEADER: RED TETRIS · room · ALIVE 4/7 · [LEAVE] ─────────────────────────┐
│                                                                                                    │
│   LEFT RAIL          ║       CENTER (HERO)        ║          RIGHT RAIL                            │
│  ┌─────────┐         ║   ┌────────────────────┐   ║   ┌──────┐ NEXT                                │
│  │  HOLD   │         ║ G │                    │ I │   │  ▣▣  │  (slot 1, scale 1.0)               │
│  │  ▣▣     │         ║ A │     10 × 20        │ N │   ├──────┤                                     │
│  └─────────┘         ║ R │      WELL          │ C │   │  ▣    │  (slots 2-5, scale .82)            │
│  ┌─────────┐         ║ B │   (recessed,      │ O │   ├──────┤                                     │
│  │ PLACE 2nd│ hero   ║ A │    dead center,   │ M │   │  ...  │                                     │
│  │ COMBO ×3 │        ║ G │    the brightest  │ B │   └──────┘                                     │
│  │ ───────  │        ║ E │    object)        │ O │   ┌────────────────────────────┐               │
│  │ LINES 14 │        ║   │                   │   │   │ RIVALS · 3      [3 ALIVE]  │               │
│  │ LEVEL 2  │        ║ M │                   │ S │   │ ┌────┐ ┌────┐ ┌────┐        │               │
│  │ score 4k │(dim)   ║ E │                   │ U │   │ │mini│ │mini│ │ KO │  ...   │               │
│  └─────────┘         ║ T │                   │ R │   │ │well│ │well│ │stmp│        │               │
│                      ║ E │                   │ G │   │ └────┘ └────┘ └────┘        │               │
│                      ║ R └────────────────────┘ E │   └────────────────────────────┘               │
│                                                                                                    │
│                              ▸ details: CONTROLS (collapsed)                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**`GameView.module.css` `.grid` becomes:**
```css
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(120px, 1fr) max-content minmax(120px, 1fr);
  align-items: center;          /* vertically center the board */
  justify-items: center;
  gap: clamp(12px, 2.2vw, 32px);
}
.leftRail  { justify-self: end;   align-self: center; }   /* hugs board's left  */
.center    { /* board */ }
.rightRail { justify-self: start; align-self: center; }   /* hugs board's right */
.leftRail, .rightRail {
  display: flex; flex-direction: column; gap: 14px;
  background: transparent;       /* DROP the opaque --panel slab */
  box-shadow: none;
}
@media (max-width: 880px) {       /* designed breakpoint, not flex-wrap accident */
  .grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
  .leftRail, .rightRail { flex-direction: row; flex-wrap: wrap; justify-content: center; }
}
```

**Board sizing — make it the hero & vh-aware** (`theme.css`): bump
```css
--cell: clamp(18px, min(3.3vw, 4.4vh), 32px);
```
so on a 1080p screen the well is ~640px tall and clearly dominant; rails stay narrow. Add the **recessed well** look to `.board` (replace the flat fill):
```css
.board {
  background: linear-gradient(180deg,#0a0a14,#06060d);
  box-shadow:
    inset 0 0 0 1px var(--well-line),
    inset 0 10px 44px rgba(0,0,0,.65),     /* recess */
    inset 0 0 80px rgba(0,0,0,.6);
}
```
Keep the existing cyan/red `.frame` gradient as the *outer* glow ring so the well reads as a physical, lit object.

**Header upgrade:** the current `.bar` reads as a debug strip. Add a **`ALIVE n / N` survivor counter** (big, tabular, cyan) and a **live placement chip `#2`** next to the room name. Keep LEAVE as the only button.

---

## 3. Familiar Tetris Conventions to Add (data each needs)

| Convention | Status | Plan & data source |
|---|---|---|
| **Hold on LEFT, Next on RIGHT** | crammed together in `.pieces` row, right side | Split: `HoldPiece` → leftRail (top), `NextQueue` → rightRail (top). No code change to the components themselves — only where `GameView` mounts them. |
| **5-deep Next w/ size taper** | ✅ already in `NextQueue` (`slice(0,5)`, `.first`/`.rest`) | Keep. Just verify `.first { transform: scale(1.12) }`, `.rest { scale:.82 }` in `NextQueue.module.css`. |
| **Hold cooldown dim** | ✅ inline `opacity:.4` in `HoldPiece` | Promote inline style → `.holdDisabled { opacity:.4; filter:grayscale(.8) }` class + a "locked" lock-glyph. Data: `selectCanHold`. |
| **Lines-to-next-level** | LINES/LEVEL shown raw | Add a thin **progress bar** under LEVEL: `width = (lines % 10)/10 * 100%`. Data: `lines`, `LINES_PER_LEVEL`. Pure derived. |
| **Combo counter** | ❌ none | Derive in `gameSlice.commitLock`: track `combo` (increment when `n>0`, reset to −1/0 when a piece locks with `n===0`). New field `combo:number`. Display `COMBO ×N` popup + leftRail chip. |
| **Back-to-Back** | ❌ none | In `commitLock`: a clear is "difficult" if `n===4` (Tetris) — we have no T-spin detection, so scope B2B to **Tetris-chains**. New field `b2b:number` (increment on consecutive Tetris, reset on any non-Tetris clear). Show `B2B ×N` ribbon. |
| **Clear-type text** (SINGLE/DOUBLE/TRIPLE/TETRIS) | board only flashes | Already have `clearFx:{lines,seq}` — perfect trigger. Map `lines`→label. |
| **Garbage / incoming meter** | ❌ none — `pendingPenalty` exists but unvisualized | New `GarbageMeter` div column on board's **left edge**, segments = `pendingPenalty`. Data: `selectPendingPenalty` (add selector). |
| **PERFECT/ALL CLEAR** | ❌ | In `commitLock`, after clear, if board is fully empty → set a transient `clearFx.perfect=true`. Flashiest popup. |
| **Lock-delay tell** | engine uses 1-frame lock (`LOCK_DELAY_FRAMES=1`), so no meaningful "resting" window | Skip the dim-before-lock tell (no real lock-delay window here). Instead lean on the **lock-flash** (§4) which fires on every commit. |

**New `gameSlice` fields:** `combo:number`, `b2b:number`, and extend `clearFx` to `{ lines:number; seq:number; combo:number; b2b:number; perfect:boolean }`. Also add `selectPendingPenalty`, `selectCombo`, `selectClearFx` to `selectors.ts`.

---

## 4. Game-Feel Pass — Event → Effect Map

`(P)` = pure CSS (toggle a class/`data-*`/CSS var, fire one-shot keyframe). `(R)` = needs a new/changed redux signal. Reuse the one **var-driven shake util** from research for all shakes.

```css
@keyframes shake {            /* in Board.module.css; --amp set per event */
  10%,90%{transform:translate(calc(var(--amp)*-1px),0)}
  30%,70%{transform:translate(calc(var(--amp)*1px),calc(var(--amp)*-.5px))}
  50%    {transform:translate(0,calc(var(--amp)*1px))}
}
```

| Event | Signal | Technique + rough keyframe |
|---|---|---|
| **Move ←→** | `current.x` change (P) | `.activePieceLayer{transition:transform 55ms cubic-bezier(.2,.9,.25,1.4)}`. Optional 90ms `leanX` skew. *Requires* moving the active piece to a sub-cell **transform layer** (see note ↓). |
| **Rotate ↑** | `current.rotation` change (P) | `rotPop` 130ms: `scale(1)→1.12 rotate(±8deg)→1` + `brightness(1.25)`. Wall-kick (x shifted): bump to ±14deg. |
| **Soft drop ↓** | `softDropActive` (R, exists) | `.softDrop::after` faint trailing clone `translateY(-6px); opacity:.25; blur(1px)`. Brighten ghost outline. |
| **Hard drop Space** | new `dropFx:{seq, fromY, toY, cols}` (R) | **(a) trail:** absolutely-positioned div spanning `fromY→toY`, `linear-gradient(transparent, var(--piece) 90%)`, `dropTrail` 160ms `scaleY(1)→0` + fade. **(b) squash:** locked cells `lockSquash` 180ms `scaleY(.82)→1.05→1`. **(c) shake:** `--amp:2; 90ms`. **(d) dust:** `::before/::after` radial blobs flung ±14px. |
| **Lock (any settle)** | `lockEvent` (R, exists) | `.justLocked` on the freshly-locked cells → `lockFlash` 120ms: `filter:brightness(2)`+white `box-shadow` → settle. Remove on `animationend`. The single biggest "tactile" win. |
| **Single / Double / Triple** | `clearFx.lines` (R, exists) | Per-row `.clearRow` overlay: white flash → `rowSweep` `clip-path:inset(0 100% 0 0)→inset(0 0 0 100%)` left→right wipe (~220ms − combo·8ms), then survivors `translateY(+cell)` settle. Cyan accent. |
| **Tetris (4)** | `clearFx.lines>=4` (R) | Keep existing `clearFlashTetris` red→white→cyan + `boardShake`; ADD 4 vertical light **pillars** (`scaleY(0→1)` white-core, fade) from cleared rows + bigger `--amp:6` shake + `TETRIS` popup. |
| **Combo** | `clearFx.combo` (R, new) | `COMBO ×N` popup via `punchIn` (`scale(0) rotate(-12deg)→1.25→1`) + `floatOut`. Heat color by N: cyan→amber→orange→red via inline `--accent`. LeftRail also shows a live combo chip. |
| **B2B** | `clearFx.b2b` (R, new) | `B2B ×N` ribbon + a leftRail **charge meter** whose inner fill `scaleY`s up per link, ramping cyan→gold→white. Discharge sweep on break. |
| **Perfect Clear** | `clearFx.perfect` (R, new) | Full-board radial bloom + `ALL CLEAR` popup at max tier + brief confetti reuse. Rarest = flashiest. |
| **Penalty IN** | `pendingPenalty` rise + new `lastAttack` (R) | Left **garbage meter** fills red bottom-up (`pulseWarn`); on land, board upward jolt `translateY(-4px→0)` + red inset vignette `dangerPulse` + shake `--amp` scaled to lines. Garbage rows slide in from bottom w/ 1-frame red flash. |
| **Near top-out** | derived `max(columnHeights) >= 16` (P, selector) | Looping slow `dangerPulse` red edge-vignette (intensity via `--danger:0..1`), board border cyan→red, subtle 900ms heartbeat `scale(1→1.005)`. Auto-clears when stack drops. |
| **Level-up** | `level` change (R, exists) | `bandWipe` scanline top→bottom across board + `LEVEL N` `punchIn` + odometer digit roll + nudge board glow hue hotter via `--level-hue`. |
| **Top-out (you)** | `status==='gameover' && !won` (R) | Board `grayscale(1) brightness(.5)` + staggered row `crumble` (`translateY(120%) rotate` per row, `delay:var(--row)*22ms`) → white flash → GameOver. |
| **Win** | `won` (R) | Gold board bloom + `~24` CSS confetti divs (`fall` keyframe, randomized `--x/--rot/--hue`) + `VICTORY` max-tier popup w/ shimmer. |

**Active-piece transform layer (enabler note):** moves/rotate/soft-drop/hard-drop juice needs the falling piece rendered as a **separate absolutely-positioned `.activePieceLayer`** over the static board grid, positioned with `transform: translate(calc(x*var(--cell)), calc(y*var(--cell)))`, instead of being baked into `overlayForRender`. This is the one structural refactor in `Board.tsx`; it unlocks smooth sub-cell gravity + every per-piece animation. The **settled stack stays a static grid** (cheap). If too costly for P1, the lock-flash, line-clear, garbage, and shake effects all work on the static grid *without* this refactor — defer the layer to P3.

---

## 5. Multiplayer Overhaul

### 5a. Opponent → "Ghost Field" mini-well (replaces `OpponentSpectrum`)
Today each rival is 10 thin bars growing up (`linear-gradient(cyan→red)`, `height: h/20`). Replace with a **board-shaped 10×20 silhouette**, color-graded by threat — reads like a TETR.IO/T99 thumbnail though it's only spectrum data.

```tsx
// OpponentSpectrum (rewritten)
<div className={`${s.card} ${alive ? '' : s.dead}`} data-justko={koSeq /* §5d */}>
  <div className={s.head}>
    <span className={s.dot} data-alive={alive} />
    <span className={s.name}>{name}</span>
    <span className={s.rank}>{rankChip /* #2 / ★#1 / OUT */}</span>
  </div>
  <div className={s.well} style={{ '--maxh': maxHeight }}>
    {spectrum.map((h, c) => (
      <div key={c} className={s.col} data-zone={zone(h) /* low|mid|high|crit */}>
        <div className={s.fill} style={{ height: `${h/20*100}%` }} />
      </div>
    ))}
    <div className={s.deathline} /> {/* ::after rule at row-16 mark */}
  </div>
</div>
```
```css
.well{position:relative;display:grid;grid-template-columns:repeat(10,1fr);
  aspect-ratio:10/20;gap:1px;padding:3px;border-radius:6px;
  background:linear-gradient(180deg,#0a0a14,#06060d);
  box-shadow:inset 0 0 0 1px var(--well-line);}
.col{display:flex;align-items:flex-end}
.fill{width:100%;border-radius:1px;transition:height 120ms cubic-bezier(.2,.8,.2,1),box-shadow 120ms}
.col[data-zone=low]  .fill{background:var(--safe)}
.col[data-zone=mid]  .fill{background:var(--caution)}
.col[data-zone=high] .fill{background:var(--warn)}
.col[data-zone=crit] .fill{background:var(--danger);box-shadow:0 0 8px var(--danger);animation:dangerPulse 900ms infinite}
.deathline{position:absolute;left:0;right:0;top:20%;height:1px;background:var(--danger);opacity:.4}
```
`zone(h)`: `crit` ≥16, `high` ≥12, `mid` ≥8, else `low`. When the whole field's `maxHeight≥16`, add `.well--danger` so the entire card throbs red. The `transition: height` makes spectrum updates animate (grow on garbage, shrink on clears) — flash brighter on jump (garbage received). **Layout:** `grid-template-columns: repeat(auto-fill, minmax(72px,1fr))` driven by `data-count` so 1 rival = big, 6+ = dense tiles.

### 5b. Players-remaining counter
Header chip + opponents-panel title: `ALIVE n / N`, computed `opponents.filter(o=>o.alive).length + (myAlive?1:0)`. Big tabular cyan numeral; **punch animation keyed on the count** each time it drops. At `2` → persistent **`FINAL DUEL`** banner + red ambiance; at `1` (you) → victory. No new server data — derivable from `opponents[]` + `selectIsAlive`.

### 5c. Incoming-attack warning (`GarbageMeter`, new component)
Thin vertical flex-column flush to the **board's left edge** (inside `.center`, absolutely positioned). N segments = `pendingPenalty`, stacked from the bottom (where garbage injects). Severity ramp: 1–2 amber, 3–4 orange, 5+ scarlet, `box-shadow` glow + faster `pulseWarn` as it climbs. A `⚠ +N` counter floats at top. When `commitLock` flushes penalty, segments `translateY→0`+fade *into* the board so cause/effect is visible.

### 5d. Attack feedback & KO drama (`listeners.ts` + `opponentsSlice` changes)
- **Stop discarding the attacker.** `listeners.ts:29` currently only forwards `count`. Forward the whole payload: `applyPenalty({ n, fromId, fromName })`, and store `lastAttack:{ fromId, count, seq }` in `gameSlice`. → highlight the **source rival card** (red outline pulse) + a `−N` tag flying from their card toward your board ("who just hit me?").
- **Outgoing:** on your clear, the rule is *clear n → send n−1*. Fire a `SENT N → ALL RIVALS` banner over your board (`punchIn` + slide-right toward the rivals rail), and a 1-frame `brightness(1.4) translateX(2px)` recoil on **all** rival cards. Trigger: `clearFx.seq`.
- **KO moment:** `opponentGameOver` → add transient `koSeq`/`koAt` per opponent in `opponentsSlice`. The card runs: `koFlash` red 200ms → columns crumble (staggered `transition-delay:var(--c)`) → a big diagonal **`KO`** stamp slams (`scale(1.4)→1 rotate(-8deg)`) → settles to `.dead` (`grayscale(.7) brightness(.6)`) with a rank chip + skull dot. A transient header banner `▼ {name} eliminated · 3 LEFT`.
- **Placement / standings (needs server, flag it):** to rank by elimination order we need a per-player finish rank. **Cheapest path within current protocol:** maintain a module-level `placementOrder: string[]` in `opponentsSlice`, appended on each `opponentGameOver` and on local `topOut`; last-to-die = best. `game:over.winnerId` confirms #1. **If the team can extend the server:** add `placement:number` to `PlayerGameOverPayload` and a `playersRemaining` to `game:over` — cleaner and authoritative. **FLAG:** client-derived placement is approximate if events arrive out of order; recommend the small server addition for the results screen accuracy.

### 5e. Pre-game countdown (`Countdown`, new component)
Full-board overlay mounted in `.center` when a match is arming. `3 → 2 → 1 → GO!` each ~700–1000ms, Press Start 2P numerals, `countPop` (`scale(2.4)→1→.85` + fade) + a concentric ring behind each; `GO!` = bigger, hot-red, triggers a white board flash and unlocks input. **Sync:** all clients share the deterministic seed; gate the countdown on `game:started` arrival (`startedAt` is in `GameStartPayload`) — start the local timer relative to `startedAt` so everyone's GO lands together. New `gameSlice` field `armedAt:number|null` (or derive from a `'arming'` status between `game:started` and first playable tick).

### 5f. End-of-match standings (upgrade `GameOverOverlay`)
Replace the score-ordered `<ol>` (it over-indexes on cosmetic score) with a **survival-ranked results screen**:
- **Hero verdict:** keep `VICTORY`/`DEFEAT`/`GAME OVER` but punch it in; winner gets `#1 LAST PILOT STANDING` + CSS crown (`clip-path` triangle) + gold radial bloom + confetti (reuse §4 win).
- **Placement rows** (div rows, not table), ordered by `placementOrder` (#1 winner top, then reverse elimination order). Each row: medal chip (`#1` gold / `#2` silver / `#3` bronze gradients), identity-colored avatar, name (YOU = glowing outline), and a **frozen final ghost-field thumbnail** (their last spectrum, dimmed) — beautiful continuity with the in-match panel. Cosmetic stats where known: your `score/lines/level`; rivals → final stack height / placement only.
- **Reveal:** rows cascade bottom-up (`revealRow` staggered `animation-delay` by rank) so the winner's crowned row lands last.
- **Buttons:** **PLAY AGAIN** (winner → existing `restart`) + **LEAVE**. Non-winners see "waiting…" with the lobby pulse. Closes the loop back to the upgraded lobby.

**New redux/socket summary:** `gameSlice` += `combo`, `b2b`, extended `clearFx`, `dropFx`, `lastAttack`, `armedAt`; selectors += `selectPendingPenalty/Combo/ClearFx/Armed`. `opponentsSlice` += per-opponent `koSeq/koAt`, module `placementOrder`. `listeners.ts` += forward `fromId/fromName`. Optional **server** additions (flagged): `placement` on `player:gameover`, `playersRemaining` on `game:over`.

---

## 6. Component-by-Component Change List

| Component | Change |
|---|---|
| **`theme.css`** | Add semantic tokens (`--well`,`--warn`,`--caution`,`--gold`,`--attack-out`); bump `--cell` to vh-aware clamp; **dim ambient** (cell glow `11px→4px`); mask blueprint/scanline away under the board. Add shared keyframes: `shake`, `punchIn`, `floatOut`, `dangerPulse`, `countPop`, `fall` (confetti). |
| **`Landing.tsx`** | Light touch: keep aesthetic; ensure room-code clarity. Optional **COPY INVITE** affordance. Lowest priority. |
| **`Lobby.tsx`** | Roster → **slot cards** with identity color (hash `id→hue`, reused in-game), `HOST` crown, `YOU` chip. Mode buttons → **descriptive selectable cards** (icon + one-liner), host-only with lock glyph for others. **Room-code COPY** + a one-line "all pilots drop the same pieces — pure skill" seed note. Optional `ready` toggle (small protocol add) else render joined = ready. |
| **`GameView.tsx`** | Re-mount into **3-column grid**: leftRail = `HoldPiece` + `ScoreHUD`; center = `GarbageMeter` + `Board` + `Countdown` overlay; rightRail = `NextQueue` + `OpponentsPanel`. Header += `ALIVE n/N` + placement chip. `Controls` → collapsed `<details>` footer. |
| **`GameView.module.css`** | Rewrite `.grid` to grid (§2), rails transparent, designed `@media` breakpoint, drop opaque `.side` slab. |
| **`Board.tsx`** | Add `.activePieceLayer` (transform-positioned piece) for sub-cell gravity + per-piece juice (P3); wire `.justLocked` cells from `lockEvent`, per-row `.clearRow` overlays from `clearFx`, `data-amp` shake, near-top-out `data-danger`. Mount `GarbageMeter`. |
| **`Board.module.css`** | Keep clear flash; add recessed-well shadows, `lockSquash`, `dropTrail`, pillars, `rowSweep`, `crumble`, garbage jolt, `dangerPulse` vignette, shake util. |
| **`Cell.tsx` / `Cell.module.css`** | Add `justLocked` prop → `.justLocked` lockFlash class (remove on `animationend`). Reduce ambient glow; keep canonical colors. Make penalty (`8`) read **hostile** (dark-red hatch + faint pulse) not "disabled gray". |
| **`HoldPiece.tsx`** | Inline `opacity` → `.holdDisabled` class + lock glyph. Stays leftRail. |
| **`NextQueue.tsx`** | No structural change (already 5 + taper). Verify `.first` scale-up / `.rest` scale-down in CSS. Stays rightRail. |
| **`ScoreHUD.tsx`** | Re-rank: **LINES/LEVEL prominent**, add **lines-to-next-level bar**, add **COMBO ×N** + **B2B ×N** chips (new selectors), and **demote SCORE** to small dim cosmetic. Optional animated count-up. |
| **`OpponentsPanel.tsx` / `OpponentSpectrum`** | Rewrite to **ghost-field mini-well** (§5a): zoned columns, deathline, danger throb, rank chip, KO crumble+stamp, identity color, `data-count` responsive grid, `ALIVE n/N` title. |
| **`OpponentsPanel.module.css`** | Replace `.bars/.track/.bar` with `.well/.col/.fill/.deathline`; add `koFlash`, KO stamp, `.well--danger`, rank chips. |
| **`Controls.tsx`** | Wrap in `<details>` (collapsed by default) or one-line footer; free the rail. Add **`@media (pointer:coarse)` touch D-pad** (div buttons → dispatch existing actions) for mobile (optional, late phase). |
| **`GameOverOverlay.*`** | Upgrade to **survival-ranked results** (§5f): crown, placement rows, frozen rival thumbnails, staggered reveal, PLAY AGAIN/LEAVE. |
| **`listeners.ts`** | Forward `fromId/fromName` on `penalty:apply`; append `placementOrder` on `opponentGameOver`/local topout; (optional) handle new server `placement`. |
| **`gameSlice.ts`** | Add `combo`,`b2b`,`dropFx`,`lastAttack`,`armedAt`; extend `clearFx`; compute combo/b2b/perfect in `commitLock`; set `dropFx` in `hardDrop`. |
| **`opponentsSlice.ts`** | Add `koSeq/koAt` per opponent; module `placementOrder`. |
| **`selectors.ts`** | Add `selectPendingPenalty`, `selectCombo`, `selectB2B`, `selectClearFx`, `selectArmed`, `selectAliveCount`, `selectPlacement`. |
| **NEW: `GarbageMeter.tsx/.module.css`** | Left-edge incoming-penalty meter (§5c). |
| **NEW: `Countdown.tsx/.module.css`** | 3-2-1-GO overlay (§5e). |
| **NEW: `ClearPopup.tsx` (+ combo/B2B)** | Reusable keyed `punchIn`/`floatOut` text popups beside the board (TETRIS/COMBO/B2B/SENT N/ALL CLEAR). |
| **NEW: `AliveCounter.tsx`** | `ALIVE n/N` + placement chip + FINAL DUEL banner. |
| **NEW: `Confetti.tsx`** | ~24 CSS confetti divs for win/perfect-clear (reused in results). |

---

## 7. Prioritized Build Order

**P1 — Layout + ambient re-rank (the "instantly looks like real Tetris" reframe). Highest impact, lowest risk, no engine changes.**
- 3-column grid: Hold+stats LEFT, Board center (vh-aware bigger cell, recessed well), Next+Rivals RIGHT; Controls → `<details>`.
- Dim ambient glow; mask grid/scanline behind the board; demote SCORE, promote LINES/LEVEL + lines-to-next bar.
- *Verify:* board is visibly the dominant object at 1080p and 1440p; hold-left/next-right matches muscle memory; no `flex-wrap` collapse — the 880px breakpoint stacks cleanly.

**P2 — Opponent ghost-field mini-wells + ALIVE counter (kills "multiplayer too bare"). Pure render, no server changes.**
- Rewrite `OpponentSpectrum` to zoned mini-wells with deathline + danger throb + responsive `data-count` grid; add `ALIVE n/N` header chip.
- *Verify:* with 1 and with 6 mock rivals the panel reads as a battlefield; a rival whose spectrum crosses height 16 visibly throbs red; ALIVE count drops on `opponentGameOver`.

**P3 — Board juice: lock-flash + hard-drop slam + per-row clear collapse + shake util. Needs `dropFx`/`lockEvent`/`clearFx` wiring (`lockEvent` already exists).**
- `.justLocked` lockFlash on every commit; hard-drop trail+squash+dust+shake; per-row `rowSweep` collapse; near-top-out vignette. (Active-piece transform layer optional here for smooth gravity; defer if heavy.)
- *Verify:* hard drop *feels* like a slam (trail+shake+flash visible); a single/double/triple shows the specific rows wiping then settling, not a whole-board pulse.

**P4 — Garbage meter + attack feedback + KO drama. Needs `listeners.ts` fix (forward `fromId`) + `opponentsSlice` koSeq + `lastAttack`.**
- Left-edge `GarbageMeter` from `pendingPenalty`; outgoing `SENT N` banner + rival recoil on your clear; incoming source-card highlight + KO crumble/stamp + `▼ eliminated · N LEFT` banner.
- *Verify:* clearing 2 lines visibly "sends 1" toward rivals; receiving penalty fills the red meter + jolts the board; a KO produces a stamped, crumbling card and decrements ALIVE.

**P5 — Combo / B2B / clear-text + level-up. Needs `combo`/`b2b` in `gameSlice.commitLock`.**
- `ClearPopup` (SINGLE…TETRIS), `COMBO ×N` heat counter, `B2B ×N` ribbon + charge meter, `LEVEL N` band-wipe, PERFECT/ALL CLEAR.
- *Verify:* consecutive clears escalate the combo number+heat; back-to-back Tetrises show B2B; perfect clear (empty board) fires the rarest banner.

**P6 — Countdown + survival results + lobby polish. Needs `armedAt` (gate on `startedAt`) + `placementOrder`.**
- `3-2-1-GO` overlay synced to `startedAt`; `GameOverOverlay` → crowned placement rows with frozen thumbnails + staggered reveal + PLAY AGAIN/LEAVE; lobby slot-cards + identity colors + mode cards + COPY INVITE.
- *Verify:* match start shows synced countdown then GO flash; results rank by survival (winner #1, gold crown, confetti) not score; play-again loops to the upgraded lobby.

**P7 (optional) — Win/top-out cinematics + mobile.** Full confetti shower / grayscale crumble defeat; `@media (pointer:coarse)` touch D-pad. *Verify:* win = gold bloom + confetti, defeat = tower crumbles to gray; touch controls dispatch real actions on a phone.

**Files most affected:** `GameView.*`, `theme.css` (P1); `OpponentsPanel.*` (P2); `Board.*`/`Cell.*` (P3); new `GarbageMeter`, `listeners.ts`, `opponentsSlice.ts`, `gameSlice.ts` (P4); new `ClearPopup`, `ScoreHUD.*` (P5); new `Countdown`, `GameOverOverlay.*`, `Lobby.*` (P6).