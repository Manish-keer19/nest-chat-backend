
import { Module } from '@nestjs/common';
import { RandomChatGateway } from './random-chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module'; // To update status if needed
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        AuthModule,
        UsersModule,
        PrismaModule,
        JwtModule.register({}),
    ],
    providers: [RandomChatGateway],
})
export class RandomChatModule { }
