import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsNotEmpty, IsString } from "class-validator";

import { PaymentState } from "src/app.interfaces";

export class WebhookPayloadDto {
    @ApiProperty({ example: "PAY-123456789", description: "Payment reference" })
    @IsString()
    @IsNotEmpty()
    paymentReference: string;

    @ApiProperty({ enum: PaymentState, example: PaymentState.SUCCESS })
    @IsEnum(PaymentState)
    status: PaymentState;

    @ApiProperty({
        example: "PROVIDER-TXN-987654321",
        description: "Provider transaction ID",
    })
    @IsString()
    @IsNotEmpty()
    providerTransactionId: string;

    @ApiProperty({
        example: "2025-11-27T12:00:00Z",
        description: "Timestamp of the webhook",
    })
    @IsISO8601()
    timestamp: string;

    @ApiProperty({
        example: "MobileMoneyProvider",
        description: "Provider name",
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    providerName?: string;
}
