import { Module } from "@nestjs/common";

import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaService } from "./prisma/prisma.service";

@Module({
    imports: [AuthModule],
    exports: [PrismaService],
    controllers: [AppController],
    providers: [AppService, PrismaService],
})
export class AppModule {}
