import passport from 'passport';
import { Express } from 'express';
import { configureGoogleStrategy } from '../services/oauth.service';
import logger from '../utils/logger';

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
