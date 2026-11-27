import { describe, expect, it } from 'vitest';
import { isAllowedWebhookSource, normalizeIp } from '../../src/services/webhook.service.js';

describe('Maya webhook source validation', () => {
  it('normalizes IPv4-mapped addresses and forwarded chains', () => {
    expect(normalizeIp('::ffff:13.229.160.234')).toBe('13.229.160.234');
    expect(normalizeIp('3.1.199.75, 10.0.0.1')).toBe('3.1.199.75');
  });

  it('accepts only allowlisted addresses in production', () => {
    const config = {
      NODE_ENV: 'production',
      MAYA_WEBHOOK_IP_ALLOWLIST: '13.229.160.234,3.1.199.75'
    };
    expect(isAllowedWebhookSource('13.229.160.234', config)).toBe(true);
    expect(isAllowedWebhookSource('::ffff:3.1.199.75', config)).toBe(true);
    expect(isAllowedWebhookSource('203.0.113.9', config)).toBe(false);
  });

  it('allows local requests outside production', () => {
    expect(isAllowedWebhookSource('127.0.0.1', { NODE_ENV: 'test' })).toBe(true);
    expect(isAllowedWebhookSource('127.0.0.1', { NODE_ENV: 'development' })).toBe(true);
  });
});
