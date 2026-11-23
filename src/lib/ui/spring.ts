export class MotionSpring {
  private frame = 0;
  private time = 0;
  velocity = 0;
  value = 0;

  constructor(private render: (value: number) => void) {}

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  place(value: number) {
    this.value = value;
    this.render(value);
  }

  moveTo(target: number, done?: () => void) {
    this.stop();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.velocity = 0;
      this.place(target);
      done?.();
      return;
    }
    const stiffness = 335, damping = 32, mass = 1;
    this.time = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(.032, (now - this.time) / 1000);
      this.time = now;
      for (let step = 0; step < 4; step++) {
        const acceleration = (-stiffness * (this.value - target) - damping * this.velocity) / mass;
        this.velocity += acceleration * elapsed / 4;
        this.value += this.velocity * elapsed / 4;
      }
      this.render(this.value);
      if (Math.abs(this.value - target) < .45 && Math.abs(this.velocity) < 8) {
        this.place(target);
        this.velocity = 0;
        done?.();
      } else this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}
