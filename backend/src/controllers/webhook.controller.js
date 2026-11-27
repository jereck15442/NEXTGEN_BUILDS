import { asyncHandler } from '../utils/async.js';
import { env } from '../config/env.js';
import * as webhookService from '../services/webhook.service.js';

export const handle = asyncHandler(async (req, res) => {
  const result = await webhookService.handleWebhook(req.body, { ip: req.ip, config: env });
  res.json(result);
});

export const returnPage = (req, res) => {
  const messages = {
    success: 'Payment completed. You can close this window and check the order status through the API.',
    failure: 'Payment failed. You can close this window and retry checkout through the API.',
    cancel: 'Payment cancelled. You can close this window and retry checkout through the API.'
  };
  res.json({ result: req.params.result, message: messages[req.params.result] });
};
