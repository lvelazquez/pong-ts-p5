import {
  AI_AIM_ERROR,
  AI_DEAD_ZONE,
  AI_SPEED_FACTOR,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_SPEEDUP,
  BALL_START_SPEED,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_BOUNCE_ANGLE,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  SERVE_DELAY,
  WIN_SCORE,
} from "./constants";

export type Side = "left" | "right";
export type Mode = "1p" | "2p";
export type Phase = "start" | "serving" | "playing" | "paused" | "over";

export interface Paddle {
  /** Top edge. */
  y: number;
  /** Aim offset used only by the AI. */
  aimError: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GameState {
  phase: Phase;
  mode: Mode;
  left: Paddle;
  right: Paddle;
  ball: Ball;
  score: Record<Side, number>;
  winner: Side | null;
  serveTimer: number;
  /** Side that will receive the next serve. */
  serveTo: Side;
  /** Phase to resume when unpausing. */
  pausedFrom: "serving" | "playing";
}

/** Per-side input: a direction (-1 up, 0 none, 1 down) or an absolute target y (centre of paddle). */
export interface PaddleInput {
  dir: number;
  target: number | null;
}

export interface Inputs {
  left: PaddleInput;
  right: PaddleInput;
}

export type Rng = () => number;

export interface StepEvents {
  paddleHit: Side | null;
  wallHit: boolean;
  scored: Side | null;
  won: Side | null;
}

export const NO_INPUT: PaddleInput = { dir: 0, target: null };

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function paddleX(side: Side): number {
  return side === "left"
    ? PADDLE_MARGIN
    : FIELD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
}

const MAX_PADDLE_Y = FIELD_HEIGHT - PADDLE_HEIGHT;
const CENTER_PADDLE_Y = MAX_PADDLE_Y / 2;

export function createState(mode: Mode = "1p"): GameState {
  return {
    phase: "start",
    mode,
    left: { y: CENTER_PADDLE_Y, aimError: 0 },
    right: { y: CENTER_PADDLE_Y, aimError: 0 },
    ball: { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 },
    score: { left: 0, right: 0 },
    winner: null,
    serveTimer: 0,
    serveTo: "right",
    pausedFrom: "playing",
  };
}

/** Begin a fresh match in the given mode. */
export function startMatch(state: GameState, mode: Mode, rng: Rng): void {
  const fresh = createState(mode);
  Object.assign(state, fresh);
  state.serveTo = rng() < 0.5 ? "left" : "right";
  beginServe(state);
}

export function beginServe(state: GameState): void {
  state.phase = "serving";
  state.serveTimer = SERVE_DELAY;
  state.ball = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 };
}

export function launchBall(state: GameState): void {
  const dir = state.serveTo === "left" ? -1 : 1;
  state.ball.vx = dir * BALL_START_SPEED;
  state.ball.vy = 0;
  state.phase = "playing";
}

export function togglePause(state: GameState): void {
  if (state.phase === "playing" || state.phase === "serving") {
    state.pausedFrom = state.phase;
    state.phase = "paused";
  } else if (state.phase === "paused") {
    state.phase = state.pausedFrom;
  }
}

/** Move a paddle toward its input. Returns nothing; mutates paddle. */
export function movePaddle(
  paddle: Paddle,
  input: PaddleInput,
  dt: number,
  speed = PADDLE_SPEED,
): void {
  const maxStep = speed * dt;
  if (input.target !== null) {
    const desired = clamp(input.target - PADDLE_HEIGHT / 2, 0, MAX_PADDLE_Y);
    paddle.y += clamp(desired - paddle.y, -maxStep, maxStep);
  } else {
    paddle.y += clamp(input.dir, -1, 1) * maxStep;
  }
  paddle.y = clamp(paddle.y, 0, MAX_PADDLE_Y);
}

/**
 * AI input: track the ball only while it approaches, otherwise drift to centre.
 * Returns a target centre-y so the paddle never overshoots.
 */
export function aiInput(state: GameState, side: Side): PaddleInput {
  const paddle = state[side];
  const approaching =
    state.phase === "playing" &&
    (side === "right" ? state.ball.vx > 0 : state.ball.vx < 0);
  const goal = approaching
    ? state.ball.y + paddle.aimError
    : FIELD_HEIGHT / 2;
  const centre = paddle.y + PADDLE_HEIGHT / 2;
  if (Math.abs(goal - centre) < AI_DEAD_ZONE) return NO_INPUT;
  return { dir: 0, target: goal };
}

/** Circle vs. paddle-rect overlap, only while the ball moves toward that paddle. */
export function ballHitsPaddle(ball: Ball, paddle: Paddle, side: Side): boolean {
  if (side === "left" ? ball.vx >= 0 : ball.vx <= 0) return false;
  const x = paddleX(side);
  const nearestX = clamp(ball.x, x, x + PADDLE_WIDTH);
  const nearestY = clamp(ball.y, paddle.y, paddle.y + PADDLE_HEIGHT);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS;
}

/** Reflect the ball off a paddle: angle depends on where it struck, speed rises up to the cap. */
export function bounceOffPaddle(ball: Ball, paddle: Paddle, side: Side): void {
  const offset = clamp(
    (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2),
    -1,
    1,
  );
  const angle = offset * MAX_BOUNCE_ANGLE;
  const speed = Math.min(
    Math.hypot(ball.vx, ball.vy) * BALL_SPEEDUP,
    BALL_MAX_SPEED,
  );
  const dir = side === "left" ? 1 : -1;
  ball.vx = dir * Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  const x = paddleX(side);
  ball.x = side === "left" ? x + PADDLE_WIDTH + BALL_RADIUS : x - BALL_RADIUS;
}

/** Which side concedes a point, if the ball is out of bounds. */
export function outOfBounds(ball: Ball): Side | null {
  if (ball.x + BALL_RADIUS < 0) return "left";
  if (ball.x - BALL_RADIUS > FIELD_WIDTH) return "right";
  return null;
}

/** Award a point to `scorer`; ends the match at WIN_SCORE, else queues the next serve. */
export function awardPoint(state: GameState, scorer: Side): void {
  state.score[scorer] += 1;
  if (state.score[scorer] >= WIN_SCORE) {
    state.winner = scorer;
    state.phase = "over";
    state.ball.vx = 0;
    state.ball.vy = 0;
    return;
  }
  // The conceding side receives the serve.
  state.serveTo = scorer === "left" ? "right" : "left";
  beginServe(state);
}

export function step(
  state: GameState,
  inputs: Inputs,
  dt: number,
  rng: Rng,
): StepEvents {
  const events: StepEvents = {
    paddleHit: null,
    wallHit: false,
    scored: null,
    won: null,
  };
  if (state.phase === "start" || state.phase === "paused" || state.phase === "over") {
    return events;
  }

  const rightInput = state.mode === "1p" ? aiInput(state, "right") : inputs.right;
  movePaddle(state.left, inputs.left, dt);
  movePaddle(
    state.right,
    rightInput,
    dt,
    state.mode === "1p" ? PADDLE_SPEED * AI_SPEED_FACTOR : PADDLE_SPEED,
  );

  if (state.phase === "serving") {
    state.serveTimer -= dt;
    if (state.serveTimer <= 0) launchBall(state);
    return events;
  }

  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - BALL_RADIUS < 0) {
    ball.y = BALL_RADIUS;
    ball.vy = Math.abs(ball.vy);
    events.wallHit = true;
  } else if (ball.y + BALL_RADIUS > FIELD_HEIGHT) {
    ball.y = FIELD_HEIGHT - BALL_RADIUS;
    ball.vy = -Math.abs(ball.vy);
    events.wallHit = true;
  }

  for (const side of ["left", "right"] as const) {
    if (ballHitsPaddle(ball, state[side], side)) {
      bounceOffPaddle(ball, state[side], side);
      events.paddleHit = side;
      state.right.aimError = (rng() * 2 - 1) * AI_AIM_ERROR;
    }
  }

  const conceded = outOfBounds(ball);
  if (conceded) {
    const scorer: Side = conceded === "left" ? "right" : "left";
    awardPoint(state, scorer);
    events.scored = scorer;
    if (state.winner) events.won = scorer;
  }
  return events;
}
