import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { WebhookPayloadDto } from "./dto/webhook-payload.dto";
import { PaymentState } from "src/app.interfaces";
import { JwtAuthGuard } from "../common/guards/auth.guard";

describe("PaymentsController", () => {
    let controller: PaymentsController;
    let service: PaymentsService;

    const mockPaymentsService = {
        createPayment: jest.fn(),
        getPaymentByReference: jest.fn(),
        updatePaymentStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    const mockAuthGuard = {
        canActivate: jest.fn(() => true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [
                {
                    provide: PaymentsService,
                    useValue: mockPaymentsService,
                },
                {
                    provide: JwtAuthGuard,
                    useValue: mockAuthGuard,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockAuthGuard)
            .compile();

        controller = module.get<PaymentsController>(PaymentsController);
        service = module.get<PaymentsService>(PaymentsService);

        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("createPayment", () => {
        it("should create a payment", async () => {
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

            mockPaymentsService.createPayment.mockResolvedValue(mockPayment);

            const result = await controller.createPayment(createDto);

            expect(result.success).toBe(true);
            expect(result.data.payment).toEqual(mockPayment);
            expect(service.createPayment).toHaveBeenCalledWith(createDto);
        });
    });

    describe("getPayment", () => {
        it("should get payment by reference", async () => {
            const reference = "PAY-123456789";
            const mockPayment = {
                id: "123",
                reference,
                amount: 10000,
                state: "INITIATED",
                providerTxns: [],
            };

            mockPaymentsService.getPaymentByReference.mockResolvedValue(mockPayment);

            const result = await controller.getPayment(reference);

            expect(result.success).toBe(true);
            expect(result.data.payment).toEqual(mockPayment);
            expect(service.getPaymentByReference).toHaveBeenCalledWith(reference);
        });
    });

    describe("updatePaymentStatus", () => {
        it("should update payment status", async () => {
            const reference = "PAY-123456789";
            const updateDto: UpdatePaymentStatusDto = {
                status: PaymentState.PENDING,
            };

            const mockPayment = {
                id: "123",
                reference,
                state: "PENDING",
            };

            mockPaymentsService.updatePaymentStatus.mockResolvedValue(mockPayment);

            const result = await controller.updatePaymentStatus(reference, updateDto);

            expect(result.success).toBe(true);
            expect(result.data.payment).toEqual(mockPayment);
            expect(service.updatePaymentStatus).toHaveBeenCalledWith(reference, updateDto);
        });
    });

    describe("handleWebhook", () => {
        it("should handle webhook", async () => {
            const webhookDto: WebhookPayloadDto = {
                paymentReference: "PAY-123456789",
                status: PaymentState.SUCCESS,
                providerTransactionId: "PROVIDER-TXN-123",
                timestamp: "2025-11-27T12:00:00Z",
                providerName: "MobileMoneyProvider",
            };

            const mockResponse = {
                processed: true,
                message: "Webhook processed successfully",
            };

            mockPaymentsService.handleWebhook.mockResolvedValue(mockResponse);

            const result = await controller.handleWebhook(webhookDto);

            expect(result.success).toBe(true);
            expect(result.data.result).toEqual(mockResponse);
            expect(service.handleWebhook).toHaveBeenCalledWith(webhookDto);
        });
    });
});
