import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { JwtPayload } from "src/app.interfaces";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        const opts = {
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!,
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        };
        super(opts);
    }
    async validate(payload: JwtPayload) {
        const user = await this.authService.validateUserFromToken(payload);
        if (!user) throw new UnauthorizedException("Expired or invalid token");
        return user;
    }
}
