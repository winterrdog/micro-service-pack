import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { AuthController } from "./auth.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
    imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
    controllers: [AuthController],
    providers: [PrismaService, AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
