import { Express } from 'express';
import passport from 'passport';
import { configureGoogleStrategy } from '../core/application/services/auth/oauth.service';
import logger from '../shared/logger/winston.logger';

/**
 * Configure Passport authentication strategies
 * @param app Express application
 */
export const configurePassport = (app: Express): void => {
  try {
    // Initialize Passport
    app.use(passport.initialize());

    // Configure Google OAuth strategy
    configureGoogleStrategy();

    logger.info('Passport configured successfully');
  } catch (error) {
    logger.error('Error configuring Passport:', error);
  }
};

export default configurePassport;
