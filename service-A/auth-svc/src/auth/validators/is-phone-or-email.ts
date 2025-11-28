import {
    isEmail,
    isMobilePhone,
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from "class-validator";

export function IsEmailOrPhone(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "isEmailOrPhone",
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, _args: ValidationArguments) {
                    if (typeof value === "string") {
                        const trimmed = value.trim();
                        return isEmail(trimmed) || isMobilePhone(trimmed);
                    }
                    return false;
                },
                defaultMessage(_args: ValidationArguments) {
                    return "Identifier must be a valid email address or phone number.";
                },
            },
        });
    };
}
