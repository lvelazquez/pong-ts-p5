import { describe, expect, it } from "vitest";
import {
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_START_SPEED,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  WIN_SCORE,
} from "../src/constants";
import {
  NO_INPUT,
  aiInput,
  awardPoint,
  ballHitsPaddle,
  bounceOffPaddle,
  createState,
  launchBall,
  movePaddle,
  outOfBounds,
  paddleX,
  startMatch,
  step,
  togglePause,
  type GameState,
} from "../src/logic";

const rng = () => 0.5;
const idle = { left: NO_INPUT, right: NO_INPUT };

function playing(mode: "1p" | "2p" = "2p"): GameState {
  const s = createState(mode);
  startMatch(s, mode, rng);
  launchBall(s);
  return s;
}

describe("paddle movement", () => {
  it("clamps to the field", () => {
    const s = createState();
    movePaddle(s.left, { dir: -1, target: null }, 10);
    expect(s.left.y).toBe(0);
    movePaddle(s.left, { dir: 1, target: null }, 10);
    expect(s.left.y).toBe(FIELD_HEIGHT - PADDLE_HEIGHT);
  });

  it("moves toward a touch target without overshooting", () => {
    const s = createState();
    s.left.y = 0;
    movePaddle(s.left, { dir: 0, target: 200 }, 10);
    expect(s.left.y).toBe(200 - PADDLE_HEIGHT / 2);
  });
});

describe("collision", () => {
  it("detects a hit on the left paddle only when moving toward it", () => {
    const s = createState();
    const x = paddleX("left") + PADDLE_WIDTH;
    const ball = { x: x + BALL_RADIUS - 1, y: s.left.y + 10, vx: -100, vy: 0 };
    expect(ballHitsPaddle(ball, s.left, "left")).toBe(true);
    expect(ballHitsPaddle({ ...ball, vx: 100 }, s.left, "left")).toBe(false);
  });

  it("misses when the ball is above the paddle", () => {
    const s = createState();
    const ball = { x: paddleX("left") + 5, y: s.left.y - 50, vx: -100, vy: 0 };
    expect(ballHitsPaddle(ball, s.left, "left")).toBe(false);
  });

  it("bounces back, angles by hit offset, and speeds up within the cap", () => {
    const s = createState();
    const mid = s.left.y + PADDLE_HEIGHT / 2;
    const centre = { x: 0, y: mid, vx: -BALL_START_SPEED, vy: 0 };
    bounceOffPaddle(centre, s.left, "left");
    expect(centre.vx).toBeGreaterThan(BALL_START_SPEED);
    expect(centre.vy).toBeCloseTo(0);

    const low = { x: 0, y: mid + PADDLE_HEIGHT / 2, vx: -BALL_START_SPEED, vy: 0 };
    bounceOffPaddle(low, s.left, "left");
    expect(low.vy).toBeGreaterThan(0);

    const fast = { x: 0, y: mid, vx: -BALL_MAX_SPEED, vy: 0 };
    bounceOffPaddle(fast, s.left, "left");
    expect(Math.hypot(fast.vx, fast.vy)).toBeLessThanOrEqual(BALL_MAX_SPEED + 1e-9);
  });

  it("reflects off top and bottom walls", () => {
    const s = playing();
    s.ball = { x: 400, y: BALL_RADIUS + 1, vx: 0, vy: -500 };
    const ev = step(s, idle, 0.01, rng);
    expect(ev.wallHit).toBe(true);
    expect(s.ball.vy).toBeGreaterThan(0);
  });
});

describe("scoring", () => {
  it("detects out of bounds on each side", () => {
    expect(outOfBounds({ x: -BALL_RADIUS - 1, y: 0, vx: 0, vy: 0 })).toBe("left");
    expect(outOfBounds({ x: FIELD_WIDTH + BALL_RADIUS + 1, y: 0, vx: 0, vy: 0 })).toBe("right");
    expect(outOfBounds({ x: 100, y: 0, vx: 0, vy: 0 })).toBeNull();
  });

  it("awards a point and serves to the conceding side", () => {
    const s = playing();
    s.ball.x = -50;
    s.ball.vx = -100;
    const ev = step(s, idle, 0.001, rng);
    expect(ev.scored).toBe("right");
    expect(s.score).toEqual({ left: 0, right: 1 });
    expect(s.phase).toBe("serving");
    expect(s.serveTo).toBe("left");
  });

  it("ends the match at WIN_SCORE", () => {
    const s = playing();
    s.score.left = WIN_SCORE - 1;
    awardPoint(s, "left");
    expect(s.phase).toBe("over");
    expect(s.winner).toBe("left");
    expect(s.score.left).toBe(WIN_SCORE);
  });

  it("does not advance once the match is over", () => {
    const s = playing();
    s.phase = "over";
    const before = JSON.stringify(s);
    step(s, idle, 1, rng);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("phases", () => {
  it("serves after the delay", () => {
    const s = createState();
    startMatch(s, "2p", rng);
    expect(s.phase).toBe("serving");
    step(s, idle, 1, rng);
    expect(s.phase).toBe("playing");
    expect(Math.abs(s.ball.vx)).toBe(BALL_START_SPEED);
  });

  it("pauses and resumes without moving the ball", () => {
    const s = playing();
    togglePause(s);
    expect(s.phase).toBe("paused");
    const x = s.ball.x;
    step(s, idle, 0.5, rng);
    expect(s.ball.x).toBe(x);
    togglePause(s);
    expect(s.phase).toBe("playing");
  });

  it("restart resets scores", () => {
    const s = playing();
    s.score.left = 3;
    startMatch(s, "1p", rng);
    expect(s.score).toEqual({ left: 0, right: 0 });
    expect(s.mode).toBe("1p");
  });
});

describe("AI", () => {
  it("tracks an approaching ball", () => {
    const s = playing("1p");
    s.ball.vx = 300;
    s.ball.y = 40;
    const input = aiInput(s, "right");
    expect(input.target).toBe(40);
  });

  it("returns to centre when the ball moves away", () => {
    const s = playing("1p");
    s.ball.vx = -300;
    s.right.y = 0;
    expect(aiInput(s, "right").target).toBe(FIELD_HEIGHT / 2);
  });

  it("is beatable: slower than the human paddle", () => {
    const s = playing("1p");
    s.ball = { x: 400, y: 0, vx: 0, vy: 0 };
    s.right.y = FIELD_HEIGHT - PADDLE_HEIGHT;
    const start = s.right.y;
    s.ball.vx = 1;
    step(s, idle, 0.1, rng);
    expect(start - s.right.y).toBeLessThan(0.1 * 420);
  });
});
