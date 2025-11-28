import { PrismaPg } from "@prisma/adapter-pg";
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";

import { PrismaClient } from "generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger("PrismaService");
    constructor() {
        const connString = process.env.DATABASE_URL;
        if (!connString) {
            throw new Error("DATABASE_URL environment variable is required");
        }
        super({
            errorFormat: "pretty",
            log: ["query", "info", "warn", "error"],
            adapter: new PrismaPg({ connectionString: connString }),
        });
    }
    async onModuleInit() {
        await this.$connect();
        this.logger.log("Connected to database, successfully");
    }
    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log("Successfully disconnected from database");
    }
}
