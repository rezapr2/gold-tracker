import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * web-api is a hybrid HTTP + RMQ microservice. Registered globally, the throttler
 * guard would otherwise also run on RMQ event handlers, where there is no Express
 * response to attach rate-limit headers to (`res.header is not a function`). Limit
 * throttling to HTTP requests and let RPC/WS contexts through untouched.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    return super.canActivate(context);
  }
}
