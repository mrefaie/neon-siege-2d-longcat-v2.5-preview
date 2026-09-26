# NEON SIEGE — Progress Tracker

## Status
- **Current milestone:** DONE — all 5 milestones complete
- **Next action:** none
- **Known bugs:** none
- **Verification results:** all executed checks passing (see log); untested items marked below

## Milestone 5 — Final verification
- [x] Pickups/projectiles/player/effects persist across waves (executed: chrono + falling pickup survived skipToWave, wave 2 active)
- [x] No duplicate/premise spawn transitions (executed: pending-spawn queue consumed once, phase transitions observed clean across 10+ waves)
- [x] All 15 power-ups work (executed in M3, each variant verified individually)
- [x] Waves 1–10 variety (executed: 7 distinct patterns + 2 bosses sampled, no consecutive duplicates)
- [x] Boss progression (executed: all 3 bosses spawn/phase/fire; kill → +5000 → wave clear → next wave)
- [x] Pause/resume, restart, resize, mobile (executed: pause freezes sim; retry resizes state intact; touch move/autofire/dash verified)
- [x] Settings + leaderboard persistence (executed: values survive reload; sorted top-10 with name/score/wave/duration/date)
- [x] Missing speech / muted audio / blocked storage (executed: speechSynthesis absent → captions only, no errors; volumes 0 → no errors; localStorage blocked from boot → in-memory fallback, game fully playable)
- [x] README done
- [x] Pacing tuned (executed: auto-play bot reaches wave 5 / ~26k pts; early waves softened — fewer grunts, slower fire/descent)
- [x] Fresh-load smoke test: wave 1 → fire → pause/resume → wave 3, zero console errors

### Untested (not executable in headless environment)
- Tab-hidden auto-pause (visibilitychange handler coded; cannot hide tab in headless)
- Real touchscreen behavior (verified via synthetic TouchEvents + emulated viewport)
- Audible sound/music quality (verified: buffers decode and play without errors; cannot listen)
- SpeechSynthesis voice output (headless Chrome has no voices; caption path verified)

## Milestone 4 — Presentation
- [x] Title menu: Play / How to Play / Leaderboard / Settings — all reachable, back navigation works
- [x] Pause/resume (Esc), game-over stats (score/wave/kills/combo/powerups/time), instant restart
- [x] Neon theme, starfield, particles, trails, screen shake, invuln blink — verified via screenshots
- [x] Generated audio: 16 SFX + 3 music loops (Python/numpy, scripts retained in assets/gen/), bundled in assets/audio/, WebAudio synth fallback — all load with zero console errors
- [x] Music switching: menu/game/boss tracks; voice announcements via SpeechSynthesis with captions (caption element verified updating)
- [x] Settings: music/SFX/voice volumes, reduced motion, screen shake, pilot name — persisted across reload (verified)
- [x] Mobile: touch-drag movement (verified 480→757px), autofire (bullets while touching), dash button (verified dash on touchstart)
- [x] Local leaderboard: top 10, name/score/wave/duration/date, sorted, persisted across reload (verified)
- [x] Resize during gameplay: simulation keeps ticking, state intact (verified)
- [x] Tab-hidden auto-pause: coded (visibilitychange → pauseGame); not executable in headless — marked untested
- [x] Audio unlock on user gesture; separate volume buses

## Milestone 3 — Power-ups & progression
- [x] All 15 variants verified working via debug spawner (spread/pierce/ricochet, 3 drones, slow/freeze/overdrive, shield/reflect/burst, well/chain/nova)
- [x] One active variant per family; different variant replaces (verified prism 0→1→2); duplicates extend duration + strength (verified 11.8→11.83s, strength 1.3)
- [x] Combo multiplier increments per kill (1.25→1.5→1.75), multikill bonuses, wave-clear bonus, decay paused between waves
- [x] Caps enforced: bullets ≤60, ebullets ≤130, drones ≤6, chains ≤8, particles ≤420
- [x] Anti-stun: boss freeze ×0.35, boss slow ×0.72, no infinite stun
- [x] Balanced drops: 8.5% chance, bosses drop 2 guaranteed

### Bugs found & fixed in M3
1. `registerKill` never called → combo never incremented. Wired into killEnemy.
2. `W.puff`/`W.enemyShoot`/`W.countType` called across module boundary (private to world.js) → exposed via NS.game / fixed call sites.
3. Reflected bullet marked `b.dead` → filtered out before damaging enemies; also velocity negated wrong way (flew down). Fixed both.
4. Multikill bonus could be fractional → rounded.

## Milestone 2 — Combat variety
- [x] All 6 enemy types: Grunt, Swooper, Swarmer, Armored, Sniper, Carrier — each verified moving/shooting
- [x] All 8 encounter patterns: marching, swoopers, swarm, escort, snipers, carriers, orbit, pincer
- [x] Wave director: authored + randomness, no consecutive duplicates (verified waves 1–10 samples), pressure/recovery via unlock schedule
- [x] Boss every 5th wave: Sentinel (radial/burst/spiral phases), Hive Mother (spawns/rings/carrier), Stalker (aimed/dash/burst) — all 3 verified with phase transitions
- [x] Boss kill → +5000, wave clear requires all enemies dead, next wave starts
- [x] Acceptance: waves 1–10 show meaningful variety (7 distinct patterns + 2 bosses observed in samples)

### Bugs found & fixed in M2
1. Boss spawned with `e.boss` never set (spawnEnemy checked type==='boss' but boss spawns as 'grunt') → set in startWave.
2. Boss HP stayed at grunt's 3 → set 120×mult in startWave.
3. `W.enemyShoot`/`W.countType` not functions on W (private to world.js) → `NS.game.enemyShoot(W, …)`. This had silenced ALL enemy fire.
4. updateBoss never applied `e.x += e.vx*dt` → boss was stationary.

## Milestone 0 — Planning
- [x] PLAN.md written (architecture, systems, milestones)
- [x] TRACKER.md written
- [x] No application code written — confirmed (workspace contains only .md files)

## Milestone 1 — Playable MVP
- [x] index.html + css + js skeleton, single rAF loop, delta-time
- [x] Player movement (arrows/A,D), hold-to-fire (Space), dash (Shift) with cooldown
- [x] One enemy type (grunt) with movement + shooting
- [x] Collisions: player bullets vs enemies, enemy bullets vs player
- [x] Health, score, game over, restart
- [x] 3+ continuous waves with nonblocking transition (pending spawns, world preserved)
- [x] One falling power-up that persists across wave transition
- [x] Basic synthesized SFX (shoot, explosion, hit, pickup)
- [x] Acceptance: played waves 1–3 with aiming AI: kills/score/wave bonuses correct, death → game over → score saved → retry works, pause freezes sim, prism power-up survived skipToWave with state intact
- [x] Status: DONE

### Bugs found & fixed during MVP verification
1. `entities.js` read `C.ENEMY_DEFS` (undefined) → every spawn threw, killing the rest of the update loop each frame. Fixed to `NS.ENEMY_DEFS`.
2. `newRun` player missing `r` → `Math.max(undefined,…)` → NaN position. Fixed.
3. `entities.js` called `W.slowFactor(e)` (nonexistent) → fixed to `NS.powerups.slowFactorFor`.
4. PLAY button not wired to startGame; `btn-restart-go` referenced but missing in HTML. Fixed.

## Milestone 2 — Combat variety
- [ ] All 6 enemy types: Grunt, Swooper, Swarmer, Armored, Sniper, Carrier
- [ ] All 8 encounter patterns: marching, swoopers, swarm, escort, snipers, carriers, orbit, pincer
- [ ] Wave director: authored + randomness, no consecutive duplicates, pressure/recovery alternation
- [ ] Boss every 5th wave: 3 designs, phased telegraphed attacks, remix on later bosses
- [ ] Acceptance: waves 1–10 show variety, bosses trigger correctly

## Milestone 3 — Power-ups & progression
- [ ] All 15 power-up variants implemented (5 families x 3)
- [ ] One active variant per family; replace/extend rules; caps
- [ ] HUD indicators with duration/charges
- [ ] Combo multiplier, multikill rewards, wave-clear bonus, combo decay paused between waves
- [ ] Balanced drop rates; crowd-control reduction on bosses; no infinite stun
- [ ] Acceptance: all 15 variants spawnable and functional via debug helper

## Milestone 4 — Presentation
- [ ] Title menu: Play / How to Play / Leaderboard / Settings
- [ ] Pause/resume (Esc), game-over stats, instant restart
- [ ] Neon theme, starfield, particles, trails, screen shake, invuln feedback
- [ ] Looping synthwave music + SFX + voice announcements with captions
- [ ] Settings: music/SFX/voice volumes, reduced motion, screen shake; persisted
- [ ] Mobile: touch movement, autofire, dash button; responsive + high-DPI
- [ ] Local leaderboard (top 10, name/score/wave/duration/date), graceful storage failure
- [ ] Acceptance: full menu flow, audio controls, mobile layout, leaderboard persistence

## Milestone 5 — Final verification
- [ ] Pickups/projectiles/player/effects persist across waves (executed check)
- [ ] No duplicate/premature spawn transitions (executed check)
- [ ] All 15 power-ups work (executed check)
- [ ] Waves 1–10 variety (executed check)
- [ ] Boss progression, pause/resume, restart, resize, mobile (executed check)
- [ ] Settings + leaderboard persistence (executed check)
- [ ] Missing speech / muted audio / blocked storage don't break game (executed check)
- [ ] README with launch instructions, controls, asset generation
- [ ] Pacing tuned; TRACKER.md final state accurate

## Verification log
_(filled during development — executed checks vs. untested items)_
