import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from './modules/seguridad/presentation/decorators/public.decorator';
import { AppService } from './app.service';

@Controller({
  path: '',
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
