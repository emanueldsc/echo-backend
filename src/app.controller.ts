import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth(): { status: 'ok'; service: 'echo-backend' } {
    return { status: 'ok', service: 'echo-backend' };
  }
}
