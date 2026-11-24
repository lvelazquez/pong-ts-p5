/** Logical field size. The canvas is scaled to fit the viewport; game math always uses these units. */
export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 500;

export const WIN_SCORE = 5;

export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 16;
/** Paddle speed in field units per second. */
export const PADDLE_SPEED = 420;

export const BALL_RADIUS = 8;
export const BALL_START_SPEED = 320;
export const BALL_MAX_SPEED = 720;
/** Multiplier applied to ball speed on every paddle hit. */
export const BALL_SPEEDUP = 1.06;
/** Steepest bounce angle off a paddle edge, in radians. */
export const MAX_BOUNCE_ANGLE = Math.PI / 3.2;
/** Seconds the ball rests at centre before each serve. */
export const SERVE_DELAY = 0.8;

/** AI tuning. Lower speed factor and larger dead zone make the AI easier to beat. */
export const AI_SPEED_FACTOR = 0.8;
export const AI_DEAD_ZONE = 12;
/** Max random aim error (field units) re-rolled at every paddle hit. */
export const AI_AIM_ERROR = 28;

/** Simulation step in seconds. */
export const FIXED_DT = 1 / 120;
export const MAX_FRAME_DT = 0.1;

export const TRAIL_LENGTH = 10;
export const SHAKE_DURATION = 0.18;
export const SHAKE_MAGNITUDE = 6;

export const COLOR_BG = "#0b0d12";
export const COLOR_FG = "#f4f4f5";
export const COLOR_DIM = "#52525b";
