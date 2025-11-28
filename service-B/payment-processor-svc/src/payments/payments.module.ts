import { Module } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../common/guards/auth.guard";
import { PaymentsController } from "./payments.controller";
import { AuthClientService } from "../common/http-client/auth-client.service";

@Module({
    controllers: [PaymentsController],
    providers: [PaymentsService, PrismaService, AuthClientService, JwtAuthGuard],
})
export class PaymentsModule {}
