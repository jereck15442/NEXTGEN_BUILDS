import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { app } from './app.js';
import { logger } from './utils/logger.js';

const fallbackUri = 'mongodb://127.0.0.1:27017/pc-parts-store';

async function start() {
  await connectDatabase(env.MONGODB_URI ?? fallbackUri);
  app.listen(env.PORT, () => logger.info(`PC Parts Store API listening on port ${env.PORT}`));
}

start().catch((error) => {
  logger.error('Failed to start API:', error.message);
  process.exit(1);
});
