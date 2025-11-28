import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Controller, Get } from "@nestjs/common";

import { AppService } from "./app.service";

@ApiTags("Health")
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get("/health")
    @ApiOperation({ summary: "Check if service is healthy" })
    getHello() {
        return this.appService.getHealth();
    }
}
