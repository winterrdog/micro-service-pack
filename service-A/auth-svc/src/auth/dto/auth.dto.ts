import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    IsMobilePhone,
    MaxLength,
    IsJWT,
} from "class-validator";

import { IsEmailOrPhone } from "../validators/is-phone-or-email";

export class RegisterDto {
    @ApiProperty({
        description: "User email address",
        example: "user@example.com",
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: "User phone number in international format",
        example: "+1234567890",
    })
    @IsString()
    @IsMobilePhone()
    phone: string;

    @ApiProperty({
        description: "User password (8-72 characters)",
        example: "SecurePass123!",
        minLength: 8,
        maxLength: 72,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;
}
export class LoginDto {
    @ApiProperty({
        description: "Email address or phone number for login",
        example: "user@example.com",
        maxLength: 254,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(254)
    @Transform(({ value }) => value?.trim())
    @IsEmailOrPhone()
    identifier: string;

    @ApiProperty({
        description: "User password",
        example: "SecurePass123!",
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
export class TokenRenewalDto {
    @ApiProperty({
        description: "Current refresh token to be renewed",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    @IsJWT()
    oldRefreshToken: string;
}
export class LogoutDto {
    @ApiProperty({
        description: "Refresh token to invalidate on logout",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
