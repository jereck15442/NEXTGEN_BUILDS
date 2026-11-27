import { WebhookEvent } from '../models/WebhookEvent.js';

export const webhookEventRepository = {
  create({ eventId, provider = 'maya', payloadHash }) {
    return WebhookEvent.create({ eventId, provider, payloadHash });
  }
};
