# Pong

Classic Pong in TypeScript with [p5.js](https://p5js.org/), built with Vite. Play against a computer opponent or a friend, with keyboard, mouse, or touch.

First to 5 points wins. The ball speeds up on every paddle hit, and where it strikes the paddle sets its bounce angle.

## Controls

| Input | Action |
| --- | --- |
| `W` / `S` or `Up` / `Down` | Move your paddle (1 player) |
| `W` / `S` and `Up` / `Down` | Left and right paddles (2 players) |
| Touch or mouse drag | Left half of the court moves the left paddle; in 2 player mode the right half moves the right paddle |
| `1` / `2` | Start a 1 or 2 player match |
| `P`, `Esc`, or `Space` | Pause / resume |
| `R` | Restart |
| `Enter` | Start a 1 player match from the start screen |

On-screen Pause and Restart buttons are also available. The game pauses automatically when the window loses focus.

## Accessibility

- Every action has a keyboard path; overlay buttons receive focus and show a visible focus ring.
- Score changes, pause state, and the winner are announced through an ARIA live region.
- With `prefers-reduced-motion: reduce`, the ball trail and screen shake are disabled.

## Development

Requires Node.js 20 or newer.

```sh
npm install
npm run dev        # dev server with hot reload
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests for collision, scoring, and AI (Vitest)
npm run lint       # ESLint
```

## Project layout

- `src/constants.ts` - all tunable numbers (field size, speeds, win score, AI difficulty).
- `src/logic.ts` - pure game logic: paddle movement, collision, scoring, AI. No p5 or DOM dependency, so it is unit-tested directly.
- `src/main.ts` - p5 rendering, input handling (keyboard, pointer), and the start/pause/game-over overlay.
- `tests/logic.test.ts` - tests for the logic module.

The game simulates on a fixed 800x500 field at a fixed 120 Hz timestep and scales the canvas to fit its container.

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`. In the repository settings, set **Pages > Source** to **GitHub Actions**. For another host, run `npm run build` and serve `dist/`; set `BASE_PATH` (for example `BASE_PATH=/pong/ npm run build`) if it is not served from the site root.
