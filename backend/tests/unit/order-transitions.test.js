import { describe, expect, it } from 'vitest';
import { LEGAL_TRANSITIONS, canTransition } from '../../src/services/order.service.js';

describe('order fulfillment transitions', () => {
  it('allows the documented forward transitions', () => {
    expect(canTransition('pending', 'processing')).toBe(true);
    expect(canTransition('processing', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  it('blocks skipping steps and leaving terminal states', () => {
    expect(canTransition('pending', 'delivered')).toBe(false);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'processing')).toBe(false);
  });

  it('has no transitions from terminal states', () => {
    expect(LEGAL_TRANSITIONS.delivered).toEqual([]);
    expect(LEGAL_TRANSITIONS.cancelled).toEqual([]);
  });
});
