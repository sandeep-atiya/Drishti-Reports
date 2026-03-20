const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(Object.keys(meta).length > 0 && { meta }),
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

const logger = {
  info: (message, meta = {}) => log('info', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  error: (message, meta = {}) => log('error', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
};

export default logger;
