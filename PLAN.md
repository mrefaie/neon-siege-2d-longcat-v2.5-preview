# NEON SIEGE — Design & Architecture Plan

A polished 2D Space Invaders–inspired browser game. Vanilla HTML/CSS/JS + Canvas 2D, no backend, no build step, no external runtime services.

## Architecture

```
index.html            — canvas + UI overlay DOM (menus, HUD, dialogs)
css/style.css         — neon theme, HUD, menus, responsive layout
js/
  main.js             — boot, screen state machine, single rAF loop
  config.js           — tunables: speeds, cooldowns, spawn tables, balance
  input.js            — keyboard + touch, action mapping, dash/fire/move
  audio.js            — WebAudio synth SFX + music sequencer, volume buses
  storage.js          — localStorage settings + top-10 scores (graceful fail)
  world.js            — the ONE continuous simulation: entities, waves, spawns
  entities.js         — player, enemies, bullets, pickups, particles, drones
  waves.js            — encounter patterns, wave director, boss definitions
  powerups.js         — 15 power-up variants (5 families x 3), interactions
  render.js           — starfield, entities, effects, screen shake, HUD draw
  ui.js               — menus, pause, game over, leaderboard, settings, captions
  debug.js            — disabled-by-default wave select + pickup spawner
assets/
  audio/              — generated .ogg/.wav SFX + music loops (bundled)
  gen/                — Python generation scripts (kept for regeneration)
```

### Core rule: one continuous world
`world.js` owns a single mutable state object created once per run. Wave transitions only:
1. Mark the wave clear, award bonus, pause combo decay briefly.
2. Queue `pendingSpawns` (enemies warp/fly in over ~1.5–3s, invulnerable during arrival).
3. Keep player, projectiles, pickups, drones, effects, cooldowns untouched.

Only `startNewRun()` rebuilds world state. Restart reuses the same loop/listeners/schedulers.

### Gameplay systems
- **Player:** horizontal movement (arrows/A,D), hold-to-fire (Space), dash with cooldown (Shift), brief invulnerability after hit.
- **Enemies (6+):** Grunt (march + drop shots), Swooper (sine dive), Swarmer (fast flock), Armored (escort shield), Sniper (aimed shots), Carrier (spawns swarmers). Bosses every 5th wave: 3 designs with phased telegraphed attacks; later bosses remix.
- **Encounters (8+):** marching formation, swoopers, swarm, armored escort, sniper nest, carrier convoy, orbit ring, pincer. Director mixes authored patterns + controlled randomness, no consecutive duplicates, alternates pressure/recovery.
- **Power-ups (15):** Prism (spread/pierce/ricochet), Drones (attacker/interceptor/collector), Chrono (slow field/freeze pulse/speed boost), Aegis (shield/reflect/exploding shield), Singularity (gravity well/chain lightning/nova). One active variant per family; different variant replaces; duplicates extend duration + strength (capped). HUD shows active effects + remaining time/charges.
- **Scoring:** per-kill points, combo multiplier with decay (paused between waves), multikill bonuses, wave-clear bonus.
- **Fairness:** crowd control reduced on bosses, no infinite stun, capped projectiles/drones/chains, escape routes in patterns.

### Presentation
- Neon sci-fi theme, parallax starfield, particle explosions, trails, restrained screen shake, damage invulnerability blink.
- Title menu: Play / How to Play / Leaderboard / Settings. Pause (Esc), game-over stats, instant restart.
- Audio: WebAudio-synthesized SFX + looping synthwave music (generated offline via Python, bundled locally). Voice announcements via browser SpeechSynthesis with captions (fallback if unavailable). Separate music/SFX/voice volume sliders. Audio unlocks on first user gesture.
- Settings: volumes, reduced motion, screen shake toggle. Persisted.
- Mobile: touch-drag movement, autofire, dash button. Responsive canvas, high-DPI.

### Reliability
- Single rAF loop, delta-time movement, bounded particle caps.
- Auto-pause on tab hidden; explicit resume. Resize keeps world state.
- Restart never duplicates listeners/loops/schedulers (init-once pattern).
- localStorage wrapped in try/catch with in-memory fallback.

## Milestones

| # | Milestone | Acceptance criteria |
|---|-----------|---------------------|
| 0 | Planning | PLAN.md + TRACKER.md exist, no app code |
| 1 | Playable MVP | Move/fire/dash, 1 enemy type, collisions, health, score, game over, restart, 3+ continuous waves, 1 power-up persisting across wave transition, basic SFX |
| 2 | Combat variety | All 6 enemy types, 8 encounter patterns, wave pacing, 3 bosses with phases |
| 3 | Power-ups | All 15 variants, HUD indicators, combos, balanced drops, caps & anti-stun |
| 4 | Presentation | Menus, VFX, music, voice+captions, settings, mobile controls, local leaderboard |
| 5 | Verification | All checks in TRACKER.md pass, README done, pacing tuned |

## Verification approach
Browser-based checks via Chrome DevTools tools: console errors, screenshots, scripted state probes (window.__NEON_DEBUG hooks), persistence checks, resize/restart/pause flows. Results recorded in TRACKER.md as executed vs. untested.
