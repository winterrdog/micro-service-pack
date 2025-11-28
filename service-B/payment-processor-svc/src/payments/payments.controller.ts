import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Logger,
    HttpCode,
    HttpStatus,
    UseGuards,
} from "@nestjs/common";

import { ApiResult } from "../app.interfaces";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../common/guards/auth.guard";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { WebhookPayloadDto } from "./dto/webhook-payload.dto";
import { PaymentResponseDto } from "./dto/payment-response.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";

@ApiBearerAuth()
@ApiTags("Payments")
@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name);

    constructor(private readonly paymentsService: PaymentsService) {}

    /**
     * Create a new payment
     */
    @Post()
    @ApiOperation({ summary: "Create a new payment" })
    @ApiResponse({
        status: 201,
        description: "Payment created successfully",
        type: PaymentResponseDto,
    })
    @ApiResponse({ status: 400, description: "Bad request" })
    async createPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<ApiResult> {
        this.logger.log("POST /payments - Creating new payment");
        return {
            success: true,
            message: "Payment created successfully",
            data: {
                payment: await this.paymentsService.createPayment(createPaymentDto),
            },
        };
    }

    /**
     * Get payment by reference
     */
    @Get(":reference")
    @ApiOperation({ summary: "Get payment by reference" })
    @ApiParam({ name: "reference", example: "PAY-123456789" })
    @ApiResponse({
        status: 200,
        description: "Payment found",
        type: PaymentResponseDto,
    })
    @ApiResponse({ status: 404, description: "Payment not found" })
    async getPayment(@Param("reference") reference: string): Promise<ApiResult> {
        this.logger.log(`GET /payments/${reference} - Fetching payment`);
        return {
            success: true,
            message: "Payment retrieved successfully",
            data: {
                payment: await this.paymentsService.getPaymentByReference(reference),
            },
        };
    }

    /**
     * Update payment status (simulating provider callback)
     */
    @Patch(":reference/status")
    @ApiOperation({ summary: "Update payment status" })
    @ApiParam({ name: "reference", example: "PAY-123456789" })
    @ApiResponse({
        status: 200,
        description: "Payment status updated",
        type: PaymentResponseDto,
    })
    @ApiResponse({ status: 400, description: "Invalid state transition" })
    @ApiResponse({ status: 404, description: "Payment not found" })
    async updatePaymentStatus(
        @Param("reference") reference: string,
        @Body() updateDto: UpdatePaymentStatusDto,
    ): Promise<ApiResult> {
        this.logger.log(`PATCH /payments/${reference}/status - Updating status`);
        return {
            success: true,
            message: "Payment status updated successfully",
            data: {
                payment: await this.paymentsService.updatePaymentStatus(reference, updateDto),
            },
        };
    }

    /**
     * Webhook endpoint for provider callbacks
     */
    @Post("webhook")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Receive payment status updates from provider" })
    @ApiResponse({
        status: 200,
        description: "Webhook processed successfully",
    })
    @ApiResponse({ status: 400, description: "Invalid webhook data" })
    async handleWebhook(@Body() webhookDto: WebhookPayloadDto): Promise<ApiResult> {
        this.logger.log("POST /payments/webhook - Processing webhook");
        return {
            success: (await this.paymentsService.handleWebhook(webhookDto)).processed,
            message: (await this.paymentsService.handleWebhook(webhookDto)).message,
            data: { result: await this.paymentsService.handleWebhook(webhookDto) },
        };
    }
}
