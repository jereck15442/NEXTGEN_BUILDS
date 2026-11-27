const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = levels[process.env.LOG_LEVEL] ?? levels.info;

function write(level, ...args) {
  if (levels[level] > threshold) return;
  const method = level === 'debug' ? 'log' : level;
  console[method](...args);
}

export const logger = {
  error: (...args) => write('error', ...args),
  warn: (...args) => write('warn', ...args),
  info: (...args) => write('info', ...args),
  debug: (...args) => write('debug', ...args)
};
