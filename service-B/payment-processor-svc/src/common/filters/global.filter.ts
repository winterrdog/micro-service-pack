import { Request, Response } from "express";
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";

import { ApiErrorResult } from "src/app.interfaces";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = 500;
        let message = "Something bad happened on our side.";
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === "string") {
                message = exceptionResponse;
            } else if (
                typeof exceptionResponse === "object" &&
                exceptionResponse !== null &&
                "message" in exceptionResponse
            ) {
                message = Array.isArray((exceptionResponse as any).message)
                    ? (exceptionResponse.message as any[]).join(" | ")
                    : (exceptionResponse as any).message;
            }
        } else if (exception instanceof Error) {
            // prisma known errors
            if ("code" in exception && (exception as any).code === "P2002") {
                status = HttpStatus.CONFLICT;
                message = "Unique constraint failed (email/phone already exists)";
            }
        }

        // log real error for debugging (never expose to client)
        this.logger.error(
            `${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : "",
        );

        // final clean response
        const errorResponse: ApiErrorResult = {
            success: false,
            message,
        };

        response.status(status).json(errorResponse);
    }
}
