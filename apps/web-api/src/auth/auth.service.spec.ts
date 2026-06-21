import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

async function buildService(config: Record<string, any>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: { sign: jest.fn(() => 'signed.jwt.token') } },
      { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

describe('AuthService', () => {
  describe('with a plaintext admin password', () => {
    let service: AuthService;
    beforeEach(async () => {
      service = await buildService({
        'admin.email': 'admin@goldtracker.com',
        'admin.password': 'Secret@123',
      });
    });

    it('returns a token for valid admin credentials', async () => {
      const result = await service.login('admin@goldtracker.com', 'Secret@123');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({ email: 'admin@goldtracker.com', role: 'admin' });
    });

    it('rejects an unknown email', async () => {
      await expect(service.login('nope@x.com', 'Secret@123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      await expect(service.login('admin@goldtracker.com', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('with a bcrypt password hash', () => {
    let service: AuthService;
    beforeEach(async () => {
      service = await buildService({
        'admin.email': 'admin@goldtracker.com',
        'admin.passwordHash': bcrypt.hashSync('Secret@123', 10),
      });
    });

    it('accepts the password matching the hash', async () => {
      const result = await service.login('admin@goldtracker.com', 'Secret@123');
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('rejects a password that does not match the hash', async () => {
      await expect(service.login('admin@goldtracker.com', 'nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
