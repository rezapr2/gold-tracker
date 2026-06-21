import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; user: any }> {
    const adminEmail = this.configService.get<string>('admin.email');
    const passwordHash = this.configService.get<string>('admin.passwordHash');
    const adminPassword = this.configService.get<string>('admin.password');

    const emailOk = this.safeEqual(email, adminEmail);

    // Prefer a bcrypt hash (ADMIN_PASSWORD_HASH); fall back to a timing-safe
    // comparison against a plaintext password for dev/back-compat.
    let passwordOk = false;
    if (passwordHash) {
      passwordOk = await bcrypt.compare(password, passwordHash);
    } else if (adminPassword) {
      passwordOk = this.safeEqual(password, adminPassword);
    }

    if (!emailOk || !passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: 'admin', email, role: 'admin' };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { email, role: 'admin' },
    };
  }

  /** Constant-time string comparison to avoid leaking length/content via timing. */
  private safeEqual(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
