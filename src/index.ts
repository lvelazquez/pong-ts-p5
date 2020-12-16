import p5 from "p5";

const s = (p: p5) => {
  const maxDim: number = Math.max(window.innerWidth, window.innerHeight);
  const minDim: number = Math.min(window.innerWidth, window.innerHeight);
  const WINDOW_HEIGHT: number = minDim;
  const WINDOW_WIDTH: number = maxDim;
  const MAX_SCORE: number = 5;
  const FONT_SIZE: number = 32;
  const BALL_SPEED: number = 6;

  function calculateFriction(velocity: p5.Vector, k: number = 0.01) {
    const dir: p5.Vector = velocity.copy();
    const normal: number = 1;
    const frictionMag: number = -k * normal;
    dir.normalize();
    return dir.mult(frictionMag);
  }

  class Particle {
    public position: p5.Vector;
    public acceleration: p5.Vector = new p5.Vector(0, 0);
    public velocity: p5.Vector = new p5.Vector(0, 0);
    public mass: number;
    constructor(x: number, y: number) {
      this.mass = 1;
      this.position = new p5.Vector(x, y);
    }

    applyForce(force: p5.Vector) {
      const f = p5.Vector.div(force, this.mass);
      this.acceleration.add(f);
    }

    update() {
      this.position.add(this.velocity);
      this.velocity.add(this.acceleration);
      this.acceleration.mult(0);
    }
  }

  class Paddle extends Particle {
    public width: number = 10;
    public height: number = 70;
    public score: number = 0;
    private isMoving: boolean = false;
    private dir: number = 0;
    constructor(x: number, y: number) {
      super(x, y);
      this.position.y = this.position.y - this.height / 2;
    }

    moveUp() {
      this.dir = -1;
      this.isMoving = true;
    }

    moveDown() {
      this.isMoving = true;
      this.dir = 1;
    }

    stop() {
      this.isMoving = false;
    }

    getBounds() {
      return {
        left: this.position.x,
        right: this.position.x + this.width,
        top: this.position.y,
        bottom: this.position.y + this.height
      };
    }

    checkBounds() {
      if (this.position.y < 0) {
        this.position.y = 0;
        this.velocity.set(0, 0);
      } else if (this.position.y > WINDOW_HEIGHT - this.height) {
        this.position.y = WINDOW_HEIGHT - this.height;
        this.velocity.set(0, 0);
      }
    }

    update() {
      super.update();

      if (this.isMoving) {
        this.velocity.limit(4);
        this.applyForce(new p5.Vector(0, this.dir));
      } else {
        if (this.velocity.mag() > 0.0001) {
          this.applyForce(calculateFriction(this.velocity, 0.7));
        }
      }

      this.checkBounds();
    }

    display() {
      p.noFill();
      p.fill(p.color("#FFFFFF"));
      p.rect(this.position.x, this.position.y, this.width, this.height);
    }
  }

  class Ball extends Particle {
    public r: number = 0;
    public size: number = 0;
    constructor(x: number, y: number, size: number = 10) {
      super(x, y);

      this.r = size * 0.5;
      this.size = size;

      const flip = p.random(1);
      if (flip > 0.5) {
        this.acceleration.set(-BALL_SPEED, 0);
      } else {
        this.acceleration.set(BALL_SPEED, 0);
      }
    }

    display() {
      p.fill(p.color(255));
      p.circle(this.position.x, this.position.y, this.size);
    }

    getBounds() {
      return {
        left: this.position.x - this.r,
        right: this.position.x + this.r,
        top: this.position.y - this.r,
        bottom: this.position.y + this.r
      };
    }

    checkBounds() {
      if (this.position.y > WINDOW_HEIGHT || this.position.y < 0) {
        this.velocity.y *= -1;
      }
    }
  }

  class Pong {
    public isStarted: boolean = false;
    public isOver: boolean = false;
    private ball: Ball = new Ball(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2);
    public player = new Paddle(3, WINDOW_HEIGHT / 2);
    public computer = new Paddle(WINDOW_WIDTH - 13, WINDOW_HEIGHT / 2);

    resetScore() {
      this.computer.score = 0;
      this.player.score = 0;
    }

    showText(str: string, size = FONT_SIZE) {
      p.textSize(size);
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(255, 255, 255);
      p.text(str, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2);
    }

    displayScore() {
      p.textSize(FONT_SIZE);
      p.fill(255, 255, 255);
      p.text(
        `${this.computer.score} - ${this.player.score}`,
        WINDOW_WIDTH / 2 - FONT_SIZE / 2,
        FONT_SIZE
      );
    }

    hitBall(paddle: Paddle) {
      const intersectY =
        paddle.position.y + paddle.height / 2 - this.ball.position.y;
      const normalizeIntersect = intersectY / (paddle.height / 2);
      this.ball.velocity.y += normalizeIntersect;
      this.ball.acceleration.add(0, 1);
    }

    play() {
      if (!this.isOver) {
        if (
          this.ball.getBounds().left < this.player.getBounds().right &&
          this.ball.getBounds().top > this.player.getBounds().top &&
          this.ball.getBounds().bottom < this.player.getBounds().bottom
        ) {
          this.ball.position.x =
            this.player.position.x + this.player.width + this.ball.r;
          this.ball.velocity.x *= -1;
          this.hitBall(this.player);
        } else if (
          this.ball.getBounds().right > this.computer.getBounds().left &&
          this.ball.getBounds().top > this.computer.getBounds().top &&
          this.ball.getBounds().bottom < this.computer.getBounds().bottom
        ) {
          this.ball.position.x = this.computer.position.x - this.ball.r;
          this.ball.velocity.x *= -1;
          this.hitBall(this.computer);
        }

        if (this.ball.position.x < 0) {
          this.computer.score++;
          this.ball.position.set(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2);
          this.ball.velocity.set(0, 0);
          setTimeout(() => {
            this.ball.acceleration.set(BALL_SPEED, 0);
          }, 200);
        } else if (this.ball.position.x > WINDOW_WIDTH) {
          this.player.score++;
          this.ball.position.set(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2);
          this.ball.velocity.set(0, 0);
          setTimeout(() => {
            this.ball.acceleration.set(-BALL_SPEED, 0);
          }, 200);
        }

        if (
          this.ball.position.y - this.computer.height / 2 <
          this.computer.position.y
        ) {
          if (this.ball.velocity.x > 0) {
            this.computer.acceleration.set(0, -0.2);
          } else {
            this.computer.acceleration.set(0, -0.05);
          }
        }
        if (
          this.ball.position.y - this.computer.height / 2 >
          this.computer.position.y
        ) {
          if (this.ball.velocity.x > 0) {
            this.computer.acceleration.set(0, 0.2);
          } else {
            this.computer.acceleration.set(0, 0.05);
          }
        }
      }

      if (this.player.score >= MAX_SCORE || this.computer.score >= MAX_SCORE) {
        this.isOver = true;
        this.showText("Game Over\n Player wins!");
      }
      if (!this.isStarted) {
        this.isOver = false;
        this.showText("Press Enter to Begin");
      } else {
        this.ball.checkBounds();
        this.ball.update();
        this.ball.display();
      }

      this.player.update();
      this.computer.update();

      this.player.display();
      this.computer.display();

      this.displayScore();
    }
  }

  const pong = new Pong();

  p.setup = () => {
    p.createCanvas(WINDOW_WIDTH, WINDOW_HEIGHT);
  };

  p.draw = () => {
    p.background(0);
    pong.play();
  };

  p.keyPressed = function () {
    if ((p.keyCode === p.ENTER && !pong.isStarted) || pong.isOver) {
      pong.isStarted = true;
    }

    if (pong.isStarted) {
      if (p.keyCode === p.UP_ARROW) {
        pong.player.moveUp();
      } else if (p.keyCode === p.DOWN_ARROW) {
        pong.player.moveDown();
      }
    }
  };

  p.keyReleased = function () {
    pong.player.stop();
  };
};

new p5(s);
