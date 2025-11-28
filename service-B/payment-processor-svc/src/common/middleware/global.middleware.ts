import helmet from "helmet";
import compression from "compression";
import { Request, Response, NextFunction } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";

@Injectable()
export class GlobalMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        if (process.env.NODE_ENV === "production") {
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", "data:", "https:"],
                        scriptSrc: ["'self'", "'unsafe-inline'"],
                    },
                },
                referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            })(req, res, () => {});

            // Gzip compression
            compression()(req, res, () => {});
        }

        // cache policy
        res.header("Cache-Control", "no-store");

        if (req.method === "OPTIONS") {
            res.sendStatus(200);
        } else {
            next();
        }
    }
}
