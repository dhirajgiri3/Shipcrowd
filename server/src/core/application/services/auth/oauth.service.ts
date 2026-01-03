import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, IUser } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { generateAccessToken, generateRefreshToken } from '../../../../shared/helpers/jwt';

// Configure Google OAuth Strategy
export const configureGoogleStrategy = (): void => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5005/api/v1/auth/google/callback',
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Check if user already exists with this Google ID (using new field)
          let user = await User.findOne({ googleId: profile.id });

          // If user exists, return the user
          if (user) {
            // Update last login information
            user.security.lastLogin = {
              timestamp: new Date(),
              ip: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
              success: true,
            };
            await user.save();

            // Log the successful login
            await createAuditLog(
              user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
              user.companyId,
              'login',
              'user',
              user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
              { message: 'User logged in via Google', success: true },
              req
            );

            return done(null, user);
          }

          // Check if user exists with the same email
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
          if (email) {
            user = await User.findOne({ email });

            // If user exists with this email, link the Google account
            if (user) {
              // Link Google account using new top-level fields
              user.googleId = profile.id;
              user.oauthProvider = 'google';
              user.isEmailVerified = true; // Google emails are verified
              user.avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatar;

              // Also update nested oauth object for backward compatibility
              user.oauth = {
                ...user.oauth,
                google: {
                  id: profile.id,
                  email: email,
                  name: profile.displayName,
                  picture: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                  accessToken,
                  refreshToken,
                },
              };

              user.security.lastLogin = {
                timestamp: new Date(),
                ip: req.ip || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                success: true,
              };

              // If user is not active, activate them (since Google email is verified)
              if (!user.isActive) {
                user.isActive = true;
                user.security.verificationToken = undefined;
                user.security.verificationTokenExpiry = undefined;
              }

              await user.save();

              // Log the account linking
              await createAuditLog(
                user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
                user.companyId,
                'update',
                'user',
                user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
                { message: 'Google account linked to existing user', success: true },
                req
              );

              return done(null, user);
            }
          }

          // Create a new user with Google profile information
          const newUser = new User({
            email: email,
            name: profile.displayName || 'Google User',
            role: 'seller', // Default role
            isActive: true, // Google accounts are pre-verified
            // New top-level OAuth fields
            googleId: profile.id,
            oauthProvider: 'google',
            isEmailVerified: true,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined,
            // Password not required for OAuth users
            password: undefined,
            // Nested oauth object for backward compatibility
            oauth: {
              google: {
                id: profile.id,
                email: email,
                name: profile.displayName,
                picture: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined,
                accessToken,
                refreshToken,
              },
            },
            profile: {
              // Add profile picture if available
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            },
          });

          await newUser.save();

          // Log the new user registration
          await createAuditLog(
            newUser._id instanceof mongoose.Types.ObjectId ? newUser._id.toString() : String(newUser._id),
            newUser.companyId,
            'create',
            'user',
            newUser._id instanceof mongoose.Types.ObjectId ? newUser._id.toString() : String(newUser._id),
            { message: 'User registered via Google', success: true },
            req
          );

          return done(null, newUser);
        } catch (error) {
          logger.error('Google authentication error:', error);
          return done(error, false);
        }
      }
    )
  );

  // Configure Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      if (user) {
        // Create a plain object with the required properties for the User type
        const userObj = {
          _id: user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
          role: user.role,
          companyId: user.companyId ? (user.companyId instanceof mongoose.Types.ObjectId ? user.companyId.toString() : String(user.companyId)) : undefined,
          // Add other properties as needed
        };
        done(null, userObj);
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  logger.info('Google OAuth strategy configured successfully');
};

// Generate tokens for OAuth authenticated users
export const generateAuthTokens = (user: IUser & { _id: mongoose.Types.ObjectId | string }) => {
  const userId = user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id);
  const accessToken = generateAccessToken(userId, user.role, user.companyId);
  const refreshToken = generateRefreshToken(userId, user.security.tokenVersion || 0);

  return { accessToken, refreshToken };
};

export default {
  configureGoogleStrategy,
  generateAuthTokens,
};
