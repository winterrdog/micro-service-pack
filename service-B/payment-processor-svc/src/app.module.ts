import { Module } from "@nestjs/common";

import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";
import { PaymentsModule } from "./payments/payments.module";

@Module({
    imports: [PaymentsModule],
    exports: [PrismaService],
    controllers: [AppController],
    providers: [AppService, PrismaService],
})
export class AppModule {}
