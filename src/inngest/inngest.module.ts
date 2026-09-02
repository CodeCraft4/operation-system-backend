import { Global, Module } from '@nestjs/common';

import { InngestService } from './inngest.service';

@Global()
@Module({
  providers: [InngestService],
  exports: [InngestService],
})
export class InngestModule {}
