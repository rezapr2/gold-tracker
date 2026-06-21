import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('stays closed below the failure threshold', () => {
    const cb = new CircuitBreaker(3, 1000);
    cb.recordFailure('p');
    cb.recordFailure('p');
    expect(cb.isOpen('p')).toBe(false);
  });

  it('opens after reaching the threshold', () => {
    const cb = new CircuitBreaker(3, 1000);
    cb.recordFailure('p');
    cb.recordFailure('p');
    cb.recordFailure('p');
    expect(cb.isOpen('p')).toBe(true);
  });

  it('reopens with a fresh trial after the cooldown elapses', () => {
    let t = 0;
    const cb = new CircuitBreaker(2, 1000, () => t);
    cb.recordFailure('p');
    cb.recordFailure('p');
    expect(cb.isOpen('p')).toBe(true);
    t = 1001;
    expect(cb.isOpen('p')).toBe(false); // cooldown over → half-open
  });

  it('resets the failure count on success', () => {
    const cb = new CircuitBreaker(2, 1000);
    cb.recordFailure('p');
    cb.recordSuccess('p');
    cb.recordFailure('p');
    expect(cb.isOpen('p')).toBe(false);
  });

  it('tracks keys independently', () => {
    const cb = new CircuitBreaker(1, 1000);
    cb.recordFailure('a');
    expect(cb.isOpen('a')).toBe(true);
    expect(cb.isOpen('b')).toBe(false);
  });
});
