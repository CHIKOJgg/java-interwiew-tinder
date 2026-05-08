import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logtailToken = process.env.LOGTAIL_TOKEN;

const targets = [];

if (isProduction) {
  // Production: JSON logs to stdout
  targets.push({
    target: 'pino/file',
    options: { destination: 1 }, // stdout
    level: 'info'
  });

  // Optional: Ship to Logtail (BetterStack)
  if (logtailToken) {
    targets.push({
      target: '@logtail/pino',
      options: { sourceToken: logtailToken },
      level: 'info'
    });
  }
} else {
  // Development: Pretty printing
  targets.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
    level: 'debug'
  });
}

const transport = pino.transport({ targets });

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  base: isProduction ? { pid: process.env.FLY_MACHINE_ID || undefined } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
}, transport);

export default logger;
