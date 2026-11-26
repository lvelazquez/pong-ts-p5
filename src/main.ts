import p5 from "p5";
import {
  BALL_RADIUS,
  COLOR_BG,
  COLOR_DIM,
  COLOR_FG,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FIXED_DT,
  MAX_FRAME_DT,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  SHAKE_DURATION,
  SHAKE_MAGNITUDE,
  TRAIL_LENGTH,
  WIN_SCORE,
} from "./constants";
import {
  NO_INPUT,
  createState,
  paddleX,
  startMatch,
  step,
  togglePause,
  type Inputs,
  type Mode,
  type PaddleInput,
  type Side,
} from "./logic";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = createState("1p");
const rng = Math.random;

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};
const host = $("canvas-host");
const stage = $("stage");
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayText = $("overlay-text");
const overlayActions = $("overlay-actions");
const pauseBtn = $<HTMLButtonElement>("pause-btn");
const restartBtn = $<HTMLButtonElement>("restart-btn");
const statusEl = $("status");

// ---- Input -----------------------------------------------------------------

const keys = new Set<string>();
const touchTarget: Record<Side, number | null> = { left: null, right: null };
const activePointers = new Map<number, Side>();

function keyDir(up: string[], down: string[]): number {
  return (up.some((k) => keys.has(k)) ? -1 : 0) + (down.some((k) => keys.has(k)) ? 1 : 0);
}

function readInputs(): Inputs {
  const wasd = keyDir(["w"], ["s"]);
  const arrows = keyDir(["arrowup"], ["arrowdown"]);
  const left: PaddleInput = {
    dir: state.mode === "1p" ? wasd || arrows : wasd,
    target: touchTarget.left,
  };
  const right: PaddleInput =
    state.mode === "2p" ? { dir: arrows, target: touchTarget.right } : NO_INPUT;
  return { left, right };
}

function begin(mode: Mode): void {
  startMatch(state, mode, rng);
  trail.length = 0;
  shake = 0;
  syncUi();
  announce(`${mode === "1p" ? "One" : "Two"} player match started. First to ${WIN_SCORE} wins.`);
}

function pause(): void {
  if (state.phase !== "playing" && state.phase !== "serving" && state.phase !== "paused") return;
  togglePause(state);
  syncUi();
  announce(state.phase === "paused" ? "Paused" : "Resumed");
}

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  const onButton = e.target instanceof HTMLButtonElement;

  if (["arrowup", "arrowdown", " "].includes(key) && !onButton) e.preventDefault();
  if (["w", "s", "arrowup", "arrowdown"].includes(key)) keys.add(key);

  if (e.repeat) return;
  if (key === "1") begin("1p");
  else if (key === "2") begin("2p");
  else if (key === "r") begin(state.mode);
  else if (key === "p" || key === "escape") pause();
  else if (key === " " && !onButton) pause();
  else if (key === "enter" && !onButton && state.phase === "start") begin("1p");
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  if (state.phase === "playing" || state.phase === "serving") pause();
});

function pointerField(e: PointerEvent): { side: Side; y: number } {
  const rect = host.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = ((e.clientY - rect.top) / rect.height) * FIELD_HEIGHT;
  return { side: state.mode === "2p" && x >= 0.5 ? "right" : "left", y };
}

host.addEventListener("pointerdown", (e) => {
  if (state.phase === "paused") return;
  host.setPointerCapture(e.pointerId);
  const { side, y } = pointerField(e);
  activePointers.set(e.pointerId, side);
  touchTarget[side] = y;
});
host.addEventListener("pointermove", (e) => {
  const side = activePointers.get(e.pointerId);
  if (!side) return;
  touchTarget[side] = pointerField(e).y;
});
const endPointer = (e: PointerEvent): void => {
  const side = activePointers.get(e.pointerId);
  if (!side) return;
  activePointers.delete(e.pointerId);
  touchTarget[side] = null;
};
host.addEventListener("pointerup", endPointer);
host.addEventListener("pointercancel", endPointer);

// ---- UI --------------------------------------------------------------------

function announce(message: string): void {
  statusEl.textContent = message;
}

function makeButton(label: string, onClick: () => void, primary = false): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (primary) b.className = "primary";
  b.addEventListener("click", onClick);
  return b;
}

function showOverlay(title: string, text: string, buttons: HTMLButtonElement[]): void {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayActions.replaceChildren(...buttons);
  overlay.hidden = false;
  buttons[0]?.focus();
}

let lastOverlayPhase = "";
function syncUi(): void {
  pauseBtn.textContent = state.phase === "paused" ? "Resume" : "Pause";
  pauseBtn.disabled = state.phase === "start" || state.phase === "over";
  restartBtn.disabled = state.phase === "start";

  if (state.phase === lastOverlayPhase) return;
  lastOverlayPhase = state.phase;

  if (state.phase === "start") {
    showOverlay("Pong", `First to ${WIN_SCORE} wins. Choose a mode to begin.`, [
      makeButton("1 player (vs computer)", () => begin("1p"), true),
      makeButton("2 players", () => begin("2p")),
    ]);
  } else if (state.phase === "paused") {
    showOverlay("Paused", "Press P, Esc, or Resume to continue.", [
      makeButton("Resume", pause, true),
      makeButton("Restart", () => begin(state.mode)),
    ]);
  } else if (state.phase === "over") {
    const name =
      state.mode === "1p"
        ? state.winner === "left" ? "You win!" : "Computer wins"
        : state.winner === "left" ? "Left player wins!" : "Right player wins!";
    showOverlay(name, `Final score ${state.score.left} to ${state.score.right}.`, [
      makeButton("Play again", () => begin(state.mode), true),
      makeButton("Change mode", () => { state.phase = "start"; syncUi(); }),
    ]);
    announce(`${name} Final score ${state.score.left} to ${state.score.right}.`);
  } else {
    overlay.hidden = true;
    // Return focus to the page so keyboard play is not trapped on a hidden button.
    if (document.activeElement instanceof HTMLButtonElement && overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }
}

pauseBtn.addEventListener("click", pause);
restartBtn.addEventListener("click", () => begin(state.mode));

// ---- Rendering -------------------------------------------------------------

const trail: { x: number; y: number }[] = [];
let shake = 0;
let accumulator = 0;


new p5((p: p5) => {
  let scale = 1;

  const fit = (): void => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    scale = Math.min(w / FIELD_WIDTH, h / FIELD_HEIGHT);
    p.resizeCanvas(Math.round(FIELD_WIDTH * scale), Math.round(FIELD_HEIGHT * scale));
  };

  p.setup = () => {
    const c = p.createCanvas(FIELD_WIDTH, FIELD_HEIGHT);
    c.parent(host);
    p.noStroke();
    p.textFont("sans-serif");
    new ResizeObserver(fit).observe(stage);
    fit();
    syncUi();
  };

  p.draw = () => {
    const reduced = prefersReducedMotion.matches;
    accumulator += Math.min(p.deltaTime / 1000, MAX_FRAME_DT);
    const inputs = readInputs();
    while (accumulator >= FIXED_DT) {
      accumulator -= FIXED_DT;
      const ev = step(state, inputs, FIXED_DT, rng);
      if (ev.scored) {
        shake = SHAKE_DURATION;
        announce(`${ev.scored === "left" ? "Left" : "Right"} scores. ${state.score.left} to ${state.score.right}.`);
      }
      if (state.phase === "playing") {
        trail.push({ x: state.ball.x, y: state.ball.y });
        if (trail.length > TRAIL_LENGTH) trail.shift();
      } else trail.length = 0;
    }
    if (state.phase === "over" || lastOverlayPhase !== state.phase) syncUi();

    p.background(COLOR_BG);
    p.push();
    p.scale(scale);
    if (!reduced && shake > 0) {
      p.translate(p.random(-SHAKE_MAGNITUDE, SHAKE_MAGNITUDE), p.random(-SHAKE_MAGNITUDE, SHAKE_MAGNITUDE));
      shake -= p.deltaTime / 1000;
    }

    // Centre line
    p.fill(COLOR_DIM);
    for (let y = 8; y < FIELD_HEIGHT; y += 28) p.rect(FIELD_WIDTH / 2 - 2, y, 4, 14);

    // Score
    p.fill(COLOR_FG);
    p.textSize(48);
    p.textAlign(p.CENTER, p.TOP);
    p.text(String(state.score.left), FIELD_WIDTH / 4, 16);
    p.text(String(state.score.right), (FIELD_WIDTH * 3) / 4, 16);

    // Paddles
    p.rect(paddleX("left"), state.left.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    p.rect(paddleX("right"), state.right.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Trail (skipped for reduced motion)
    if (!reduced) {
      trail.forEach((t, i) => {
        p.fill(244, 244, 245, ((i + 1) / TRAIL_LENGTH) * 70);
        p.circle(t.x, t.y, BALL_RADIUS * 2 * ((i + 1) / TRAIL_LENGTH));
      });
    }

    // Ball
    if (state.phase !== "start" && state.phase !== "over") {
      p.fill(COLOR_FG);
      p.circle(state.ball.x, state.ball.y, BALL_RADIUS * 2);
    }
    p.pop();
  };
});
