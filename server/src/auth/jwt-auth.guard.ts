import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

type AuthenticatedRequest = Request & { user: { sub: number; name: string; role: string } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedException("Sign in to view your orders.");
    try {
      request.user = await this.jwt.verifyAsync(authorization.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException("Your session has expired. Please sign in again.");
    }
  }
}