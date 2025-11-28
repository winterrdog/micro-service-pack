import { config } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global.filter";
import { GlobalMiddleware } from "./common/middleware/global.middleware";
import { RateLimitMiddleware } from "./common/middleware/rate-limit.middleware";

config();
startApplication();

// ================
// implementation
// ================

async function startApplication() {
    const logger = new Logger("Main");
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

    app.enableShutdownHooks();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    // middleware
    if (process.env.NODE_ENV === "production") {
        app.set("trust proxy", 1);
        app.disable("x-powered-by");
        app.disable("etag");
    }

    app.enableCors({
        credentials: true,
        allowedHeaders: "Content-Type, Authorization",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
    });
    app.use(new GlobalMiddleware().use.bind(new GlobalMiddleware()));
    app.use(new RateLimitMiddleware().use.bind(new RateLimitMiddleware()));

    const config = new DocumentBuilder()
        .setTitle("Service A (Authentication) API")
        .setDescription("Used for authentication purposes.")
        .setVersion("1.0")
        .addBearerAuth()
        .addTag("auth", "Authentication endpoints")
        .addServer("https://localhost/a", "Production (via Nginx - Load Balanced)")
        .addServer("http://localhost:3000", "Development (Direct)")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    await app.listen(process.env.PORT ?? 3000, process.env.HOST!).then(() => {
        logger.log(`Server started successfully on port ${process.env.PORT ?? 3000}`);
        logger.log(`Swagger docs available at http://localhost:${process.env.PORT ?? 3000}/docs`);
    });
}
