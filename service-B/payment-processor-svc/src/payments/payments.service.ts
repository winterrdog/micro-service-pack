import { customAlphabet } from "nanoid";
import { Logger, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import { Payment } from "generated/prisma/client";
import { Currency, PaymentState } from "src/app.interfaces";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { WebhookPayloadDto } from "./dto/webhook-payload.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);
const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
    [PaymentState.INITIATED]: [PaymentState.PENDING],
    [PaymentState.PENDING]: [PaymentState.SUCCESS, PaymentState.FAILED],
    [PaymentState.SUCCESS]: [],
    [PaymentState.FAILED]: [],
};

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a new payment with INITIATED state
     */
    async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
        this.logger.log(`Creating payment for ${createPaymentDto.customerPhone}`);

        try {
            const reference = this.generatePaymentReference();
            const data = {
                reference,
                state: PaymentState.INITIATED,
                amount: createPaymentDto.amount,
                currency: createPaymentDto.currency,
                paymentMethod: createPaymentDto.paymentMethod,
                customerPhone: createPaymentDto.customerPhone,
                customerEmail: createPaymentDto.customerEmail,
            };

            const payment = await this.prisma.payment.create({ data });
            this.logger.log(`Payment created with reference: ${reference}`);
            return payment;
        } catch (error: any) {
            this.logger.error("Error happened during payment creation", error);
            throw error;
        }
    }

    /**
     * Get payment by reference
     */
    async getPaymentByReference(reference: string): Promise<Payment> {
        this.logger.log(`Fetching payment with reference: ${reference}`);

        try {
            const payment = await this.prisma.payment.findUnique({
                where: { reference },
                include: { providerTxns: true },
            });

            if (!payment) {
                throw new NotFoundException(`Payment with reference ${reference} not found`);
            }

            this.logger.log(`Payment fetched with reference: ${reference}`);
            return payment;
        } catch (error: any) {
            this.logger.error("Error happened during payment fetching", error);
            throw error;
        }
    }

    /**
     * Update payment status with state transition validation
     */
    async updatePaymentStatus(
        reference: string,
        updateDto: UpdatePaymentStatusDto,
    ): Promise<Payment> {
        this.logger.log(`Updating payment ${reference} to status ${updateDto.status}`);

        try {
            const payment = await this.getPaymentByReference(reference);
            this.validateStateTransition(payment.state as PaymentState, updateDto.status);

            const updatedPayment = await this.prisma.payment.update({
                where: { reference },
                data: {
                    state: updateDto.status,
                    // set provider name when moving to 'PENDING'
                    ...(updateDto.status === PaymentState.PENDING && {
                        providerName: "MobileMoneyProvider",
                    }),
                },
            });

            this.logger.log(`Payment ${reference} updated to ${updateDto.status}`);
            return updatedPayment;
        } catch (error: any) {
            this.logger.error("Error happened during payment status update", error);
            throw error;
        }
    }

    /**
     * Handle webhook from payment provider (idempotent)
     */
    async handleWebhook(
        webhookDto: WebhookPayloadDto,
    ): Promise<{ processed: boolean; message: string }> {
        this.logger.log(`Received webhook for payment: ${webhookDto.paymentReference}`);

        try {
            const providerName = webhookDto.providerName || "DefaultProvider";

            // is webhook already processed? (idempotency??)
            const existingDelivery = await this.checkWebhookDelivery(
                providerName,
                webhookDto.providerTransactionId,
            );

            if (existingDelivery) {
                this.logger.warn(`Webhook already processed: ${webhookDto.providerTransactionId}`);
                return { processed: false, message: "Webhook already processed" };
            } else {
                const payment = await this.getPaymentByReference(webhookDto.paymentReference);
                this.validateStateTransition(payment.state as PaymentState, webhookDto.status);
                await this.processWebhookTransaction(payment.id, webhookDto, providerName);

                this.logger.log(
                    `Webhook processed successfully for payment: ${webhookDto.paymentReference}`,
                );

                return { processed: true, message: "Webhook processed successfully" };
            }
        } catch (error: any) {
            this.logger.error("Error happened during webhook processing", error);
            throw error;
        }
    }

    /**
     * Generate unique payment reference
     */
    private generatePaymentReference(): string {
        const random = nanoid();
        const timestamp = Date.now();
        return `PAY-${timestamp}-${random}`;
    }

    /**
     * Validate payment state transition
     */
    private validateStateTransition(currentState: PaymentState, newState: PaymentState): void {
        const allowedStates = VALID_TRANSITIONS[currentState];
        if (allowedStates.includes(newState)) return;
        throw new BadRequestException(`Cannot change from '${currentState}' to '${newState}'.`);
    }

    /**
     * Check if webhook was already delivered (idempotency check)
     */
    private async checkWebhookDelivery(
        providerName: string,
        providerTxId: string,
    ): Promise<boolean> {
        const query = {
            where: {
                providerName_providerTxId: {
                    providerName,
                    providerTxId,
                },
            },
        };
        const delivery = await this.prisma.webhookDelivery.findUnique(query);
        return Boolean(delivery);
    }

    /**
     * Process webhook in a transaction
     */
    private async processWebhookTransaction(
        paymentId: string,
        webhookDto: WebhookPayloadDto,
        providerName: string,
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // update payment state
            await tx.payment.update({
                where: { id: paymentId },
                data: { providerName, state: webhookDto.status },
            });

            // make a new provider transaction record
            await tx.providerTransaction.create({
                data: {
                    paymentId,
                    providerName,
                    providerTransactionId: webhookDto.providerTransactionId,
                    status: webhookDto.status,
                    amount: 0x0, // will come from webhook in real scenario
                    currency: Currency.UGX, // will come from webhook in real scenario
                },
            });

            // label webhook as 'delivered'
            await tx.webhookDelivery.create({
                data: {
                    providerName,
                    processed: true,
                    payloadHash: null,
                    processedAt: new Date(),
                    providerTxId: webhookDto.providerTransactionId,
                },
            });
        });
    }
}
