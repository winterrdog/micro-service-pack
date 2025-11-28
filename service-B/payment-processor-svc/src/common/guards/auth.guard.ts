import { Request } from "express";
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { AuthClientService } from "../http-client/auth-client.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly authClient: AuthClientService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const token = this.extractToken(req);

        if (!token) throw new UnauthorizedException("No token provided");
        else {
            const user = await this.authClient.validateToken(token);
            req.user = user;
            return true;
        }
    }
    private extractToken(request: Request): string | null {
        const authHeader = request.header("authorization");
        if (!authHeader) return null;
        else {
            const [type, token] = authHeader.split(" ");
            return type === "Bearer" ? token : null;
        }
    }
}
