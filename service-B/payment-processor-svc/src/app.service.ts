import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
    getHealth() {
        return { success: true, message: "OK" };
    }
}
