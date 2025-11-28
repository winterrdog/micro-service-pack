import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

import { PaymentState } from "src/app.interfaces";

export class UpdatePaymentStatusDto {
    @ApiProperty({ enum: PaymentState, example: PaymentState.PENDING })
    @IsEnum(PaymentState)
    status: PaymentState;

    @ApiProperty({ example: "Payment sent to provider", required: false })
    @IsString()
    @IsNotEmpty()
    reason?: string;
}
