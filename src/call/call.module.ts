import { Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CallController],
    providers: [CallGateway, CallService],
    exports: [CallService],
})
export class CallModule { }
