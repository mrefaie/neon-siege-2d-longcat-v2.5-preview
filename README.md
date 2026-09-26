# NEON SIEGE

A polished 2D Space Invaders–inspired browser game. Vanilla HTML/CSS/JS + Canvas 2D. No build step, no backend, no external services.

> Built by **LongCat v2.5 Preview Model** in the **OpenCode** harness — produced 200K tokens to make the game.

## Run it

Any static file server works:

```bash
cd space-invaders-longcat-v2.5-preview
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly from disk also works in most browsers.)

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | Arrow keys / A D | Touch-drag |
| Fire | Space (hold) | Autofire |
| Dash (brief invulnerability) | Shift | DASH button |
| Pause | Esc | — |

## Gameplay

- Endless waves; boss every 5th wave (3 designs with phased, telegraphed attacks; later bosses remix).
- 6 enemy types, 8 encounter patterns (marching, swoopers, swarm, armored escort, snipers, carriers, orbit, pincer) mixed from authored patterns + controlled randomness — no consecutive duplicates.
- 15 power-ups in 5 families (Prism, Drones, Chrono, Aegis, Singularity), 3 variants each. One active variant per family; a different variant replaces, duplicates extend duration and strengthen. HUD shows active effects with remaining time/charges.
- Combo multiplier, multikill rewards, wave-clear bonuses. Combo decay pauses between waves.
- Wave transitions never reset the world: player, projectiles, pickups, drones and effects persist; enemies warp/fly in invulnerable during arrival.
- Local leaderboard (top 10: name, score, wave, duration, date) and settings persist in localStorage, with graceful in-memory fallback when storage is unavailable.

## Project layout

```
index.html          canvas + menu/HUD DOM
css/style.css       neon theme, menus, responsive layout
js/
  config.js         tunables (speeds, cooldowns, caps, balance)
  main.js           boot, screen state machine, single rAF loop
  world.js          the ONE continuous simulation (entities, waves, spawns)
  entities.js       player/enemy/boss behaviors, factories
  waves.js          encounter patterns, wave director, boss roster
  powerups.js       15 power-up variants, drops, combo scoring
  render.js         starfield, entities, effects, HUD, screen shake
  ui.js             menus, pause, game over, leaderboard, settings, captions
  audio.js          WebAudio synth SFX/music + bundled-file playback, voice
  input.js          keyboard + touch
  storage.js        localStorage settings + scores (graceful fallback)
  debug.js          disabled-by-default debug helper (?debug=1)
assets/
  audio/            generated SFX + music loops (bundled)
  gen/gen_audio.py  asset generation script (numpy)
```

## Asset generation

All audio is generated locally — no network access, no API keys:

```bash
pip install numpy
python3 assets/gen/gen_audio.py
```

Regenerates the 16 SFX WAVs and 3 looping synthwave tracks (menu / game / boss) into `assets/audio/`. The game plays the bundled files when available and falls back to real-time WebAudio synthesis otherwise. Voice announcements use the browser's SpeechSynthesis with on-screen captions.

## Settings

Music / effects / voice volumes, reduced motion, screen shake, and pilot name — all persisted. Audio unlocks on first user gesture. The game auto-pauses when the tab is hidden.

## Debug mode

Append `?debug=1` to the URL for a debug bar: jump to any wave, spawn any power-up, inspect state. Disabled by default.
