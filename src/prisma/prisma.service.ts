import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    // Load DB URL from .env
    const connectionString = configService.get<string>('DATABASE_URL');

    // Create Prisma adapter
    const adapter = new PrismaPg({ connectionString });

    // Pass adapter to PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('📌 Prisma Connected to DB');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
