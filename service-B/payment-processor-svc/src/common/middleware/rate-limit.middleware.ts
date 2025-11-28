import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        this.limiter(req, res, next);
    }

    private limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100,
        standardHeaders: "draft-7", // Return rate limit info in headers
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many requests, please try again later.",
            data: null,
        },
        statusCode: 429,
        keyGenerator: (req: Request) => {
            // If user is authenticated → limit per user
            // @ts-ignore – req.user comes from JWT guard
            return req.user?.id || ipKeyGenerator(req.ip);
        },
    });
}
