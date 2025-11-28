export interface ApiResult {
    success: boolean;
    message: string;
    data?: object;
}
export interface ApiErrorResult {
    success: boolean;
    message: string;
}
export interface JwtPayload {
    sub: string;
}
