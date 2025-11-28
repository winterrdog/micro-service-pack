import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsEnum,
    IsMobilePhone,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

import { Currency, PaymentMethod } from "src/app.interfaces";

export class CreatePaymentDto {
    @ApiProperty({ example: 10000, description: "Payment amount" })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ enum: Currency, example: Currency.UGX })
    @IsEnum(Currency)
    currency: Currency;

    @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOBILE_MONEY })
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @ApiProperty({
        example: "+256700000000",
        description: "Customer's phone number",
    })
    @IsString()
    @IsNotEmpty()
    @IsMobilePhone()
    customerPhone: string;

    @ApiProperty({ example: "customer@example.com", required: false })
    @IsEmail()
    @IsOptional()
    customerEmail?: string;
}
