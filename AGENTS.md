# AGENTS.md

Vanilla HTML5 Canvas Asteroids clone. 4 files, no build step, no dependencies,
no package.json, no tests, no linter, no CI. `game.js` is the entire game.

## Run it

```bash
npx serve .        # then http://localhost:3000
```

Opening `index.html` via `file://` also works — there are no ES modules, no
`fetch`, and no asset loading. Prefer a served page for anything nontrivial.

## Hard constraints (breaking these silently breaks the game)

- `index.html` loads `game.js` as a **classic script** (`<script src>`, no
  `type="module"`). Do not add `import`/`export`, and do not wrap the file in an
  IIFE or module. Game state (`ship`, `bullets`, `asteroids`, `particles`,
  `score`, `lives`, `level`, `state`, `deadTimer`) is declared as top-level `let`
  and reassigned from `initGame`/`nextLevel`; that only works at script top level.
- No test runner and no lint config exist. **Do not add one unless asked** — it
  would be the only tooling in the repo. Verification is manual: load the page
  and exercise the state.
- Canvas size is hardcoded in **two** places that must stay in sync:
  `const W = 800` / `const H = 600` (game.js:5-6) and the `width`/`height`
  attributes on `<canvas>` (index.html:23).

## Architecture notes

- **State machine** (`state`): `'playing' | 'dead' | 'gameover'`. `update()`
  early-returns per state, so new logic must be placed in the `'playing'` branch
  only, or it silently won't run in `'dead'`/`'gameover'`. The one deliberate
  exception is the skin cycle at the very top of `update()`, above every branch,
  because it must work in all three states.
- **Ship skins** (`SKINS` in game.js): a data-only list of `{id, name, stroke,
  flame, hull, radius?, mult?}` where `hull` is a local-space vertex list drawn
  by the shared `drawHull(skin)` helper — the same data-driven approach as
  `Asteroid.verts`, so there are no art assets. `Ship.draw()` and
  `drawLifeIcon()` both call it, which is why the HUD icons track the active
  hull. `radius` (default 12) is the collision radius, exposed through the
  `Ship.radius` getter so `KeyC` cycling applies it instantly; `mult` (default
  1) multiplies every kill at the single scoring line in `update()`. Bullets
  spawn at the hull's frontmost x + 1 (derived in `tryShoot`), the shield
  bubble is `ship.radius + SHIELD_GAP`, and `drawLifeIcon` normalizes scale by
  `radius` — so a 2× hull like `titan` (`radius: 24, mult: 2`) needs no special
  cases. The flame anchor is derived from the hull's rearmost x, so it needs no
  extra field.
- **Skin persistence** is `localStorage` wrapped in try/catch (`file://` and
  private mode throw). `loadSkin()` runs once at bootstrap, deliberately *not*
  inside `initGame()` — a restart must not clobber the choice. Skins are stored by
  `id`, not array index, so reordering `SKINS` can't scramble a saved preference.
- **`pressed(code)` is consumed**, so `KeyC` is read at most once per frame, at
  the top of `update()`.
- **Asteroid sizes are 1-based indices** into three parallel arrays in game.js:61-63
  (`RADII`, `SPEEDS`, `POINTS`; index 0 unused). 1=small, 2=medium, 3=large.
  `split()` returns two of `size - 1`, so scores and radii are always read via
  `POINTS[a.size]` / `RADII[size]`. Adding a size means editing all three arrays
  plus `spawnAsteroids`.
- **Ship spawn is hardcoded to center** in `Ship.reset()` (game.js:126-127), and
  `spawnAsteroids` avoids a 130px `SAFE_DIST` radius around `W/2, H/2` to keep
  the first wave from killing you. Change one and you must change the other.
- **`wrap()` is applied to ship, bullets, and asteroids, but not `Particle`.**
  Particles intentionally die at the edges. Don't "fix" that.
- **Collision is center-distance, not shape-based.** Bullets use
  `dist < a.radius` (ignores bullet radius); the ship uses
  `ship.radius + a.radius * 0.82` for forgiveness, and only when
  `ship.invincible <= 0`.

## Input gotcha

`pressed(code)` (game.js:20) **consumes** the flag — it reads `justPressed[code]`
and resets it to `false`. Call it at most once per code per frame; a second call
returns `false` and the input is lost. Because the flag persists until read, a
`Space` press during the `'dead'` state fires a shot the instant state returns to
`'playing'`. `keys[code]` is the separate held-state map.

## Style

- **All prose in the repo is Spanish** — code comments, UI strings (`SCORE`,
  `NIVEL`, `GAME OVER`, `PUNTAJE`), and the README. Write new comments and user-facing
  text in Spanish to match.
- 2-space indent; `'use strict'` at the top; `// ── Section ────` banner comments
  separate each class/section. Constructor bodies align `=` in columns.
- Constants that are tuning values (speeds, radii, cooldowns) are declared
  inline in their class, not hoisted to a config block.

## Features that exist now (older notes claimed they didn't)

- **`ShootingStar extends Asteroid`** — spawned from `initGame`/`nextLevel` and
  re-spawned every `STAR_SPAWN_EVERY` seconds while none is alive. It inherits
  `Asteroid.update`, so `ttl` is decremented *after* movement; `split()` returns
  `[]`, and `points`/`burst` are overridden (300 pts / 22 particles).
- **`PowerUp`** — 25% drop on asteroid kill (`DROP_CHANCE`), 20s ttl, magnet pull
  inside `MAGNET_DIST`. Two types in `POWERUP_TYPES`: `boost` (`ship.speedBoost`,
  doubles `THRUST`) and `triple` (`ship.tripleShot`, `tryShoot` returns 3 bullets
  offset laterally by `GAP` but with an identical angle). Both last 5s
  (`BOOST_TIME`/`TRIPLE_TIME`), are cleared by `killShip`, and reset in
  `Ship.reset()`. The inner glyph in `PowerUp.draw` distinguishes them
  (1 bar vs 3 bars).
- **Shield (`Mayús`)** — a bubble of radius `ship.radius + SHIELD_GAP` that deflects asteroids when raised (while `shield > SHIELD_MIN`), consumes `SHIELD_DRAIN` per second and recharges at `SHIELD_RECHARGE` when released. Deflected asteroids are pushed outward with a minimum exit velocity and emit a small burst; shield energy persists across re-spawn/level changes but is cleared by `killShip`.
- All four timer bars (`drawTimerBar`) stack down the top-left corner: shooting
  star first, then boost, then triple, then shield — `row` advances by 34 each time.
- **Skins** — data-driven `SKINS` with `drawHull`; `KeyC` cycles, persisted in `localStorage` with id-based keys; HUD icons and flame follow the active skin. Includes `titan` (TITÁN): a 2× purple CLÁSICA silhouette with `radius: 24` and `mult: 2` — double points while active, but a bigger target.

## Git

`origin` = your fork (`DmitriyU`), `upstream` = the original course repo
(`DevTalles-corp`). No documented branch or PR convention. Commit only when
explicitly asked; do not push to `upstream`.
