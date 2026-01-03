/**
 * VelocityAuth Unit Tests
 *
 * Tests token lifecycle management, encryption, and proactive refresh
 * Coverage targets: 85%+
 */

import mongoose from 'mongoose';
import { VelocityAuth } from '../../../src/infrastructure/external/couriers/velocity/velocity.auth';
import { Integration } from '../../../src/infrastructure/database/mongoose/models';
import { encryptData, decryptData } from '../../../src/shared/utils/encryption';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create mock axios instance
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
  }
} as any;

// Mock Integration model
jest.mock('../../../src/infrastructure/database/mongoose/models/system/integrations/integration.model');
const MockedIntegration = Integration as jest.Mocked<typeof Integration>;

// Mock encryption utilities
jest.mock('../../../src/shared/utils/encryption');
const mockedEncrypt = encryptData as jest.MockedFunction<typeof encryptData>;
const mockedDecrypt = decryptData as jest.MockedFunction<typeof decryptData>;

describe('VelocityAuth', () => {
  let auth: VelocityAuth;
  const testCompanyId = new mongoose.Types.ObjectId();
  const testBaseUrl = 'https://shazam.velocity.in';
  const mockToken = 'mock-auth-token-12345';
  const mockEncryptedToken = 'encrypted:mock-auth-token-12345';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    auth = new VelocityAuth(testCompanyId, testBaseUrl);

    // Setup default mocks
    mockedEncrypt.mockReturnValue(mockEncryptedToken);
    mockedDecrypt.mockReturnValue(mockToken);

    // Mock environment variables
    process.env.VELOCITY_USERNAME = '+918860606061';
    process.env.VELOCITY_PASSWORD = 'Velocity@123';
  });

  afterEach(() => {
    delete process.env.VELOCITY_USERNAME;
    delete process.env.VELOCITY_PASSWORD;
  });

  describe('authenticate()', () => {
    it('should successfully authenticate and return token', async () => {
      const mockResponse = {
        data: {
          token: mockToken,
          expires_in: 86400 // 24 hours in seconds
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);
      MockedIntegration.findOneAndUpdate = jest.fn().mockResolvedValue(mockIntegration);

      const token = await auth.authenticate();

      expect(token).toBe(mockToken);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/custom/api/v1/auth-token',
        {
          username: expect.any(String),
          password: expect.any(String)
        }
      );
      expect(MockedIntegration.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw error if integration not found', async () => {
      MockedIntegration.findOne = jest.fn().mockResolvedValue(null);

      await expect(auth.authenticate()).rejects.toThrow(
        'Velocity Shipfast integration not found or not active'
      );
    });

    it('should throw error if credentials missing', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        settings: { isActive: true },
        credentials: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      // Temporarily delete environment variables
      delete process.env.VELOCITY_USERNAME;
      delete process.env.VELOCITY_PASSWORD;

      await expect(auth.authenticate()).rejects.toThrow(
        'Velocity credentials not configured'
      );

      // Restore environment variables
      process.env.VELOCITY_USERNAME = '+918860606061';
      process.env.VELOCITY_PASSWORD = 'Velocity@123';
    });

    it('should handle API authentication failure', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      });

      await expect(auth.authenticate()).rejects.toThrow();
    });

    it('should encrypt token before storing', async () => {
      const mockResponse = {
        data: {
          token: mockToken,
          expires_in: 86400
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        },
        metadata: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);
      MockedIntegration.findOneAndUpdate = jest.fn().mockResolvedValue(mockIntegration);

      await auth.authenticate();

      expect(mockedEncrypt).toHaveBeenCalledWith(mockToken);
      expect(MockedIntegration.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should calculate and store expiry time', async () => {
      const mockResponse = {
        data: {
          token: mockToken,
          expires_in: 86400 // 24 hours
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        },
        metadata: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);
      MockedIntegration.findOneAndUpdate = jest.fn().mockResolvedValue(mockIntegration);

      const beforeTime = Date.now();
      await auth.authenticate();
      const afterTime = Date.now();

      expect(MockedIntegration.findOneAndUpdate).toHaveBeenCalled();
      const updateCall = (MockedIntegration.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(updateCall[1].$set['metadata.tokenExpiresAt']).toBeDefined();
    });
  });

  describe('getValidToken()', () => {
    it('should return cached token if valid', async () => {
      const futureExpiry = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now

      // Set cache manually
      (auth as any).tokenCache = {
        token: mockToken,
        expiresAt: futureExpiry
      };

      const token = await auth.getValidToken();

      expect(token).toBe(mockToken);
      expect(MockedIntegration.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB if cache expired', async () => {
      const futureExpiry = new Date(Date.now() + 5 * 60 * 60 * 1000);

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          accessToken: mockEncryptedToken
        },
        metadata: {
          tokenExpiresAt: futureExpiry
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      const token = await auth.getValidToken();

      expect(token).toBe(mockToken);
      expect(MockedIntegration.findOne).toHaveBeenCalled();
      expect(mockedDecrypt).toHaveBeenCalledWith(mockEncryptedToken);
    });

    it('should authenticate if no stored token', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        },
        metadata: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      const mockResponse = {
        data: {
          token: mockToken,
          expires_in: 86400
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const token = await auth.getValidToken();

      expect(token).toBe(mockToken);
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('should refresh token if expiring soon (proactive refresh)', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes (< 1 hour)

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password',
          accessToken: mockEncryptedToken
        },
        metadata: {
          tokenExpiresAt: soonExpiry
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      const mockResponse = {
        data: {
          token: 'new-mock-token',
          expires_in: 86400
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
      mockedDecrypt.mockReturnValue('new-mock-token');

      const token = await auth.getValidToken();

      expect(token).toBe('new-mock-token');
      expect(mockAxiosInstance.post).toHaveBeenCalled(); // Should re-authenticate
    });

    it('should cache token after fetching from DB', async () => {
      const futureExpiry = new Date(Date.now() + 5 * 60 * 60 * 1000);

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          accessToken: mockEncryptedToken
        },
        metadata: {
          tokenExpiresAt: futureExpiry
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      await auth.getValidToken();

      // Second call should use cache
      await auth.getValidToken();

      expect(MockedIntegration.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken()', () => {
    it('should force refresh token', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        },
        metadata: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      const mockResponse = {
        data: {
          token: 'refreshed-token',
          expires_in: 86400
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
      mockedDecrypt.mockReturnValue('refreshed-token');

      const token = await auth.refreshToken();

      expect(token).toBe('refreshed-token');
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('should clear cache after refresh', async () => {
      // Set cache
      (auth as any).tokenCache = {
        token: 'old-token',
        expiresAt: new Date(Date.now() + 1000)
      };

      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        },
        metadata: {}
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);

      const mockResponse = {
        data: {
          token: 'new-token',
          expires_in: 86400
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
      mockedDecrypt.mockReturnValue('new-token');

      await auth.refreshToken();

      // Cache should be updated with new token
      expect((auth as any).tokenCache.token).toBe('new-token');
    });
  });

  describe('clearToken()', () => {
    it('should clear cache and DB token', async () => {
      // Set cache
      (auth as any).tokenCache = {
        token: mockToken,
        expiresAt: new Date()
      };

      MockedIntegration.findOneAndUpdate = jest.fn().mockResolvedValue({});

      await auth.clearToken();

      expect((auth as any).tokenCache).toBeNull();
      expect(MockedIntegration.findOneAndUpdate).toHaveBeenCalledWith(
        {
          companyId: testCompanyId,
          type: 'courier',
          provider: 'velocity-shipfast'
        },
        {
          $unset: {
            'credentials.accessToken': '',
            'metadata.tokenExpiresAt': '',
            'metadata.lastTokenRefresh': ''
          }
        }
      );
    });

    it('should handle missing integration gracefully', async () => {
      MockedIntegration.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(auth.clearToken()).resolves.not.toThrow();
      expect((auth as any).tokenCache).toBeNull();
    });
  });

  describe('Token Validity Checks', () => {
    it('should consider token valid if expiry > 1 hour away', () => {
      const futureExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      const isValid = (auth as any).isTokenValid(futureExpiry);
      expect(isValid).toBe(true);
    });

    it('should consider token invalid if expiry < 1 hour away', () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const isValid = (auth as any).isTokenValid(soonExpiry);
      expect(isValid).toBe(false);
    });

    it('should consider token invalid if already expired', () => {
      const pastExpiry = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const isValid = (auth as any).isTokenValid(pastExpiry);
      expect(isValid).toBe(false);
    });

    it('should consider token invalid at exactly 1 hour before expiry', () => {
      const oneHourExpiry = new Date(Date.now() + 60 * 60 * 1000); // Exactly 1 hour
      const isValid = (auth as any).isTokenValid(oneHourExpiry);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during authentication', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          username: 'encrypted-username',
          password: 'encrypted-password'
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(auth.authenticate()).rejects.toThrow('Network error');
    });

    it('should handle database errors', async () => {
      MockedIntegration.findOne = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(auth.getValidToken()).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle decryption errors', async () => {
      const mockIntegration = {
        _id: new mongoose.Types.ObjectId(),
        companyId: testCompanyId,
        provider: 'velocity-shipfast',
        credentials: {
          accessToken: 'corrupted-encrypted-data'
        },
        metadata: {
          tokenExpiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000)
        }
      };

      MockedIntegration.findOne = jest.fn().mockResolvedValue(mockIntegration);
      mockedDecrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(auth.getValidToken()).rejects.toThrow('Decryption failed');
    });
  });
});
