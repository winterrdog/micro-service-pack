import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { WebhookPayloadDto } from "./dto/webhook-payload.dto";
import { PaymentState } from "src/app.interfaces";

describe("PaymentsService", () => {
    let service: PaymentsService;
    let prisma: PrismaService;

    const mockPrismaService = {
        payment: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        webhookDelivery: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        providerTransaction: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);
        prisma = module.get<PrismaService>(PrismaService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("createPayment", () => {
        it("should create a payment with INITIATED state", async () => {
            const createDto: CreatePaymentDto = {
                amount: 10000,
                currency: "UGX" as any,
                paymentMethod: "MOBILE_MONEY" as any,
                customerPhone: "+256700000000",
                customerEmail: "test@example.com",
            };

            const mockPayment = {
                id: "123",
                reference: "PAY-123456789",
                ...createDto,
                state: "INITIATED",
                providerName: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.payment.create.mockResolvedValue(mockPayment);

            const result = await service.createPayment(createDto);

            expect(result).toEqual(mockPayment);
            expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    amount: createDto.amount,
                    currency: createDto.currency,
                    paymentMethod: createDto.paymentMethod,
                    customerPhone: createDto.customerPhone,
                    customerEmail: createDto.customerEmail,
                    state: "INITIATED",
                }),
            });
        });

        it("should generate unique payment reference", async () => {
            const createDto: CreatePaymentDto = {
                amount: 5000,
                currency: "USD" as any,
                paymentMethod: "MOBILE_MONEY" as any,
                customerPhone: "+256700000001",
            };

            mockPrismaService.payment.create.mockResolvedValue({
                id: "456",
                reference: "PAY-987654321",
                ...createDto,
                state: "INITIATED",
            });

            await service.createPayment(createDto);

            const createCall = mockPrismaService.payment.create.mock.calls[0][0];
            expect(createCall.data.reference).toMatch(/^PAY-\d+-[A-Z0-9]+$/);
        });
    });

    describe("getPaymentByReference", () => {
        it("should return payment when found", async () => {
            const reference = "PAY-123456789";
            const mockPayment = {
                id: "123",
                reference,
                amount: 10000,
                state: "INITIATED",
                providerTxns: [],
            };

            mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

            const result = await service.getPaymentByReference(reference);

            expect(result).toEqual(mockPayment);
            expect(mockPrismaService.payment.findUnique).toHaveBeenCalledWith({
                where: { reference },
                include: { providerTxns: true },
            });
        });

        it("should throw NotFoundException when payment not found", async () => {
            mockPrismaService.payment.findUnique.mockResolvedValue(null);

            await expect(service.getPaymentByReference("INVALID")).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("updatePaymentStatus", () => {
        it("should update payment from INITIATED to PENDING", async () => {
            const reference = "PAY-123456789";
            const currentPayment = {
                id: "123",
                reference,
                state: "INITIATED",
            };
            const updatedPayment = {
                ...currentPayment,
                state: "PENDING",
                providerName: "MobileMoneyProvider",
            };

            mockPrismaService.payment.findUnique.mockResolvedValue(currentPayment);
            mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

            const updateDto: UpdatePaymentStatusDto = {
                status: PaymentState.PENDING,
            };

            const result = await service.updatePaymentStatus(reference, updateDto);

            expect(result.state).toBe("PENDING");
            expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
                where: { reference },
                data: expect.objectContaining({
                    state: PaymentState.PENDING,
                    providerName: "MobileMoneyProvider",
                }),
            });
        });

        it("should update payment from PENDING to SUCCESS", async () => {
            const reference = "PAY-123456789";
            const currentPayment = {
                id: "123",
                reference,
                state: "PENDING",
            };
            const updatedPayment = {
                ...currentPayment,
                state: "SUCCESS",
            };

            mockPrismaService.payment.findUnique.mockResolvedValue(currentPayment);
            mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

            const updateDto: UpdatePaymentStatusDto = {
                status: PaymentState.SUCCESS,
            };

            const result = await service.updatePaymentStatus(reference, updateDto);

            expect(result.state).toBe("SUCCESS");
        });

        it("should throw BadRequestException for invalid state transition", async () => {
            const reference = "PAY-123456789";
            const currentPayment = {
                id: "123",
                reference,
                state: "INITIATED",
            };

            mockPrismaService.payment.findUnique.mockResolvedValue(currentPayment);

            const updateDto: UpdatePaymentStatusDto = {
                status: PaymentState.SUCCESS, // Invalid: INITIATED -> SUCCESS
            };

            await expect(service.updatePaymentStatus(reference, updateDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("should not allow transitions from SUCCESS state", async () => {
            const reference = "PAY-123456789";
            const currentPayment = {
                id: "123",
                reference,
                state: "SUCCESS",
            };

            mockPrismaService.payment.findUnique.mockResolvedValue(currentPayment);

            const updateDto: UpdatePaymentStatusDto = {
                status: PaymentState.FAILED,
            };

            await expect(service.updatePaymentStatus(reference, updateDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("handleWebhook", () => {
        it("should process webhook successfully", async () => {
            const webhookDto: WebhookPayloadDto = {
                paymentReference: "PAY-123456789",
                status: PaymentState.SUCCESS,
                providerTransactionId: "PROVIDER-TXN-123",
                timestamp: "2025-11-27T12:00:00Z",
                providerName: "MobileMoneyProvider",
            };

            const mockPayment = {
                id: "123",
                reference: webhookDto.paymentReference,
                state: "PENDING",
                providerTxns: [],
            };

            mockPrismaService.webhookDelivery.findUnique.mockResolvedValue(null);
            mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return callback(mockPrismaService);
            });

            const result = await service.handleWebhook(webhookDto);

            expect(result.processed).toBe(true);
            expect(result.message).toBe("Webhook processed successfully");
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
        });

        it("should handle duplicate webhook (idempotency)", async () => {
            const webhookDto: WebhookPayloadDto = {
                paymentReference: "PAY-123456789",
                status: PaymentState.SUCCESS,
                providerTransactionId: "PROVIDER-TXN-123",
                timestamp: "2025-11-27T12:00:00Z",
            };

            const existingDelivery = {
                id: "456",
                providerName: "DefaultProvider",
                providerTxId: webhookDto.providerTransactionId,
                processed: true,
            };

            mockPrismaService.webhookDelivery.findUnique.mockResolvedValue(existingDelivery);

            const result = await service.handleWebhook(webhookDto);

            expect(result.processed).toBe(false);
            expect(result.message).toBe("Webhook already processed");
            expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
        });

        it("should throw BadRequestException for invalid webhook state transition", async () => {
            const webhookDto: WebhookPayloadDto = {
                paymentReference: "PAY-123456789",
                status: PaymentState.SUCCESS,
                providerTransactionId: "PROVIDER-TXN-123",
                timestamp: "2025-11-27T12:00:00Z",
            };

            const mockPayment = {
                id: "123",
                reference: webhookDto.paymentReference,
                state: "INITIATED", // Invalid: INITIATED -> SUCCESS
                providerTxns: [],
            };

            mockPrismaService.webhookDelivery.findUnique.mockResolvedValue(null);
            mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

            await expect(service.handleWebhook(webhookDto)).rejects.toThrow(BadRequestException);
        });
    });
});
