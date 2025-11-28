import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

interface AuthValidationResponse {
    success: boolean;
    message: string;
    data?: {
        id: string;
        email: string;
        phone: string;
    };
}

@Injectable()
export class AuthClientService {
    private readonly authServiceUrl: string;
    private readonly logger = new Logger(AuthClientService.name);

    constructor() {
        this.authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3000";
    }

    /**
     * Validate token by calling auth service /auth/me endpoint
     */
    async validateToken(token: string): Promise<AuthValidationResponse["data"]> {
        this.logger.log("Validating token with auth service");

        try {
            const response = await fetch(`${this.authServiceUrl}/auth/me`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                this.logger.warn(`Token validation failed: ${response.status}`);
                throw new UnauthorizedException("Invalid or expired token");
            } else {
                const result: AuthValidationResponse = await response.json();
                const { success, data } = result;
                if (!success || !data) {
                    throw new UnauthorizedException("Token validation failed");
                }
                this.logger.log(`Token validated for user: ${data.id}`);
                return result.data;
            }
        } catch (error: any) {
            this.logger.error("Error validating token", error.stack);
            throw new UnauthorizedException("Authentication failed");
        }
    }
}
