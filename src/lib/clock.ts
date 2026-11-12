let clockMs = 0;
const listeners = new Set<() => void>();
let timer = 0;

/** One 1-second clock for the ordering countdown and the daily reseed check. */
export function subscribeClock(listener: () => void) {
  clockMs = Date.now();
  listeners.add(listener);
  if (timer === 0) {
    timer = window.setInterval(() => {
      clockMs = Date.now();
      for (const current of [...listeners]) {
        current();
      }
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== 0) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
}

export function readClock(): number {
  if (clockMs === 0) {
    clockMs = Date.now();
  }
  return clockMs;
}
