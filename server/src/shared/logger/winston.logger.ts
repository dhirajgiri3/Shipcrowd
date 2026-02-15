import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
// Import our global type augmentation for Express.Request
import '../../types/express';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Determine appropriate log level based on environment
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'test') {
    return 'warn'; // Only log warnings and errors during tests
  } else if (process.env.NODE_ENV === 'production') {
    return 'info';
  } else {
    return 'debug'; // Development environment
  }
};

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  format: logFormat,
  defaultMeta: { service: 'Shipcrowd-api' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    // Write logs to file
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write logs to MongoDB (optional - can be enabled later)
    // new winston.transports.MongoDB({
    //   db: process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd',
    //   collection: 'logs',
    //   options: { useUnifiedTopology: true },
    //   expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    //   level: 'info',
    // }),
  ],
});

// Add correlation ID to logs
export const addCorrelationId = (req: Request, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

// Create a child logger with correlation ID
export const getRequestLogger = (req: Request) => {
  return logger.child({
    correlationId: req.correlationId,
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?._id,
  });
};

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
