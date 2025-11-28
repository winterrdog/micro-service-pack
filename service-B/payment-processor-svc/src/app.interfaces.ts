export enum PaymentState {
    INITIATED = "INITIATED",
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}
export enum Currency {
    UGX = "UGX",
    USD = "USD",
}
export enum PaymentMethod {
    MOBILE_MONEY = "MOBILE_MONEY",
}
export interface ApiResult {
    success: boolean;
    message: string;
    data?: any;
}
export interface ApiErrorResult {
    success: false;
    message: string;
}
