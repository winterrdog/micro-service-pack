import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { ApiResult } from "src/app.interfaces";
import { User } from "generated/prisma/client";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user/get-user.decorator";
import { LoginDto, LogoutDto, RegisterDto, TokenRenewalDto } from "./dto/auth.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
    constructor(private service: AuthService) {}

    @Post("register")
    @ApiOperation({
        summary: "Register a new user",
        description:
            "Creates a new user account with email, phone, and password. The password is hashed before storing in the database. After registration, use the login endpoint to get access tokens.",
    })
    @ApiResponse({
        status: 201,
        description: "User registered successfully. You can now login with your credentials.",
    })
    @ApiResponse({
        status: 400,
        description: "Invalid input data (e.g., weak password, invalid phone number).",
    })
    @ApiResponse({
        status: 409,
        description:
            "Email or phone number already in use. Please use a different email or phone number.",
    })
    async register(@Body() dto: RegisterDto) {
        const result: ApiResult = {
            success: true,
            message: "User registered sucessfully. Please login next.",
            data: { ...(await this.service.register(dto)), password: undefined },
        };
        return result;
    }

    @Post("login")
    @ApiOperation({
        summary: "Login with email or phone",
        description:
            "Authenticates a user using their email or phone number and password. Returns an access token (short-lived, for API requests) and a refresh token (long-lived, for getting new access tokens). Store both tokens securely on the client side.",
    })
    @ApiResponse({
        status: 200,
        description: "Login successful. Returns access token and refresh token.",
    })
    @ApiResponse({
        status: 401,
        description: "Invalid credentials (wrong email/phone or password).",
    })
    async login(@Body() dto: LoginDto) {
        const result: ApiResult = {
            success: true,
            message: "User logged in successfully",
            data: await this.service.login(dto),
        };
        return result;
    }

    @Post("refresh-token")
    @ApiOperation({
        summary: "Get a new access token",
        description:
            "Exchanges your current refresh token for a new pair of tokens (access + refresh). Use this when your access token expires instead of asking the user to login again. The old refresh token becomes invalid after this request.",
    })
    @ApiResponse({
        status: 200,
        description: "Token renewed successfully. Returns new access token and refresh token.",
    })
    @ApiResponse({
        status: 401,
        description: "Invalid or expired refresh token.",
    })
    async renewToken(@Body() dto: TokenRenewalDto) {
        const { oldRefreshToken } = dto;
        const result: ApiResult = {
            success: true,
            message: "Token renewed successfully",
            data: await this.service.renewToken(oldRefreshToken),
        };
        return result;
    }

    @Post("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get current user information",
        description:
            "Returns the profile information of the currently logged-in user. Requires a valid access token in the Authorization header (Bearer token). Use this to check if a user is still authenticated or to display user details.",
    })
    @ApiResponse({
        status: 200,
        description: "Returns user ID, email, and phone number.",
    })
    @ApiResponse({
        status: 401,
        description: "Missing or invalid access token. User needs to login or refresh their token.",
    })
    async me(@GetUser() user: User) {
        const result: ApiResult = {
            success: true,
            message: "Authenticated user info",
            data: { ...user, password: undefined },
        };
        return result;
    }

    @Post("logout")
    @ApiOperation({
        summary: "Logout and invalidate refresh token",
        description:
            "Logs out the user by invalidating their refresh token in the database. After logout, the refresh token can no longer be used to get new access tokens. The user will need to login again to get new tokens.",
    })
    @ApiResponse({
        status: 200,
        description: "Logout successful. Refresh token has been invalidated.",
    })
    @ApiResponse({
        status: 400,
        description: "Invalid refresh token format.",
    })
    async logout(@Body() dto: LogoutDto) {
        await this.service.logout(dto.refreshToken);
        return { success: true, message: "Logged out successfully" };
    }
}
