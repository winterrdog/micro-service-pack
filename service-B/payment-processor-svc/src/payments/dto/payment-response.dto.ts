import { ApiProperty } from "@nestjs/swagger";

export class PaymentResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
    id: string;

    @ApiProperty({ example: "PAY-123456789" })
    reference: string;

    @ApiProperty({ example: 10000 })
    amount: string;

    @ApiProperty({ example: "UGX" })
    currency: string;

    @ApiProperty({ example: "MOBILE_MONEY" })
    paymentMethod: string;

    @ApiProperty({ example: "+256700000000" })
    customerPhone: string;

    @ApiProperty({ example: "customer@example.com", required: false })
    customerEmail?: string;

    @ApiProperty({ example: "INITIATED" })
    state: string;

    @ApiProperty({ example: "MobileMoneyProvider", required: false })
    providerName?: string;

    @ApiProperty({ example: "2025-11-27T12:00:00Z" })
    createdAt: Date;

    @ApiProperty({ example: "2025-11-27T12:00:00Z" })
    updatedAt: Date;
}
