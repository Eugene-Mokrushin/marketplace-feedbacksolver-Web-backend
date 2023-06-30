import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';
const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret-key'),
};
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockLog = {
    warn: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLog },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should throw an error if token is expired ', async () => {
      const payload = { iat: 1234567890, exp: 1 };
      const req = {};
      await expect(strategy.validate(payload, req)).rejects.toThrowError(
        UnauthorizedException,
      );
    });
    it('should throw an error if email is not present in payload', async () => {
      const payload = { iat: 1234567890, exp: 999999999999 };
      const req = {};
      await expect(strategy.validate(payload, req)).rejects.toThrowError(
        UnauthorizedException,
      );
    });
    it('should return the payload if email is present', async () => {
      const payload = {
        email: 'test@example.com',
        iat: 1234567890,
        exp: 999999999999,
      };
      const req = {};
      const result = await strategy.validate(payload, req);
      expect(result).toEqual({ email: 'test@example.com' });
    });
  });
});
