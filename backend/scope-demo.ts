import 'reflect-metadata';
import { Controller, Get, Injectable, Module, Scope } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Injectable()
export class DefaultCounter {
  count = 0;
  constructor() {
    console.log('  -> new DefaultCounter()');
  }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestCounter {
  count = 0;
  constructor() {
    console.log('  -> new RequestCounter()');
  }
}

@Controller()
export class DemoController {
  constructor(
    private readonly defaultCounter: DefaultCounter,
    private readonly requestCounter: RequestCounter,
  ) {
    console.log('  -> new DemoController()');
  }

  @Get('count')
  count() {
    this.defaultCounter.count++;
    this.requestCounter.count++;
    return {
      default: this.defaultCounter.count,
      request: this.requestCounter.count,
    };
  }
}

@Module({
  controllers: [DemoController],
  providers: [DefaultCounter, RequestCounter],
})
class DemoModule {}

console.log('Starting the app:');
const app = await NestFactory.create(DemoModule, { logger: false });
await app.listen(3456);
for (const n of [1, 2, 3]) {
  console.log(`\nRequest ${n}:`);
  const response = await fetch('http://localhost:3456/count');
  console.log('  response:', await response.text());
}
await app.close();
