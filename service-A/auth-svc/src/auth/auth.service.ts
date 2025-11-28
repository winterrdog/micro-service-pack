import * as argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { Injectable, UnauthorizedException, ConflictException, Logger } from "@nestjs/common";

import { JwtPayload } from "src/app.interfaces";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { PrismaService } from "../prisma/prisma.service";
import { User, RefreshToken } from "generated/prisma/client";

interface Tokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly jwt: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    async register(dto: RegisterDto) {
        const { email, password, phone } = dto;

        try {
            const exists: User | null = await this.prisma.user.findFirst({
                where: { OR: [{ email }, { phone }] },
            });

            if (exists) {
                this.logger.log(`Registration attempt for existing user: ${email}`);
                throw new ConflictException("User already exists");
            } else {
                const hash = await this.hashPassword(password);
                const userData = { email, phone, password: hash };
                const newUser = await this.prisma.user.create({ data: userData });

                const { refreshToken } = await this.generateTokens(newUser.id);
                await this.saveRefreshToken(newUser.id, refreshToken);

                this.logger.log(`New user successfully registered: ${newUser.email}`);
                return newUser;
            }
        } catch (error: any) {
            this.logger.error(`Error in register: ${error.stack}`);
            throw error;
        }
    }
    async login(dto: LoginDto): Promise<Tokens> {
        const { identifier, password } = dto;

        try {
            const user: User | null = await this.prisma.user.findFirst({
                where: { OR: [{ email: identifier }, { phone: identifier }] },
            });

            if (!user || !(await this.verifyPassword(user.password, password))) {
                this.logger.log(`Failed login attempt for identifier: ${identifier}`);
                throw new UnauthorizedException("Invalid credentials");
            }

            const { accessToken, refreshToken } = await this.generateTokens(user.id);
            await this.saveRefreshToken(user.id, refreshToken);

            this.logger.log(`User successfully logged in: ${user.email}`);

            return { accessToken, refreshToken };
        } catch (error: any) {
            this.logger.error(`Error in login: ${error.stack}`);
            throw error;
        }
    }
    async renewToken(refreshToken: string): Promise<Tokens> {
        try {
            const tokenRecord = await this.findValidRefreshToken(refreshToken);
            if (!tokenRecord) {
                this.logger.log(`Invalid refresh token: ${refreshToken}`);
                throw new UnauthorizedException("Invalid refresh token");
            }
            if (tokenRecord.expiresAt < new Date()) {
                this.logger.log(`Refresh token expired for user ID: ${tokenRecord.userId}`);
                await this.revokeRefreshToken(refreshToken);
                throw new UnauthorizedException("Refresh token expired");
            }
            try {
                await this.jwt.verifyAsync(refreshToken); // throws if invalid/expired
            } catch {
                throw new UnauthorizedException("Invalid refresh token");
            }

            const userId = tokenRecord.userId;
            await this.revokeRefreshToken(refreshToken);

            // issue brand new access + refresh tokens
            const { accessToken, refreshToken: newRefreshToken } =
                await this.generateTokens(userId);
            await this.saveRefreshToken(userId, newRefreshToken);

            this.logger.log(`Token renewed for user ID: ${userId}`);

            return { accessToken, refreshToken: newRefreshToken };
        } catch (error: any) {
            this.logger.error(`Error in renewToken: ${error.stack}`);
            throw error;
        }
    }
    async logout(refreshToken: string): Promise<void> {
        try {
            await this.revokeRefreshToken(refreshToken).catch((error) => {
                // we don't throw here; logout should always succeed
                this.logger.log(`User logged out successfully but error happened: ${error.stack}`);
            });
            this.logger.log(`User logged out successfully`);
        } catch (error: any) {
            this.logger.error(`Error in logout: ${error.stack}`);
            throw error;
        }
    }

    // helper for auth guards
    async validateUserFromToken(payload: JwtPayload): Promise<User | null> {
        try {
            return this.prisma.user.findUnique({ where: { id: payload.sub } });
        } catch (error: any) {
            this.logger.error(`Error in validateUserFromToken: ${error.stack}`);
            throw error;
        }
    }

    // PRIVATES

    private hashPassword = (password: string) => argon2.hash(password);

    private verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

    private generateTokens = async (userId: string): Promise<Tokens> => {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync({ sub: userId }, { expiresIn: "15m" }),
            this.jwt.signAsync({ sub: userId, jti: randomUUID() }, { expiresIn: "7d" }),
        ]);

        return { accessToken, refreshToken };
    };

    // save refresh token to DB
    private saveRefreshToken = async (userId: string, token: string) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    };

    // remove old refresh token
    private revokeRefreshToken = (token: string) => {
        return this.prisma.refreshToken.delete({ where: { token } });
    };

    // find valid refresh token
    private findValidRefreshToken = (token: string): Promise<RefreshToken | null> => {
        return this.prisma.refreshToken.findFirst({
            where: {
                token,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
    };
}
