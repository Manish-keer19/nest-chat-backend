import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,   // keep in .env
      signOptions: { expiresIn: '60m' },       // access token expiry
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtAccessStrategy,      // ← Register the strategy
    JwtRefreshStrategy,     // ← Register refresh strategy
    JwtAuthGuard,           // ← Register the guard
    RolesGuard,             // ← Register the roles guard
  ],
  exports: [JwtAuthGuard, RolesGuard],  // ← Export so other modules can use it
})
export class AuthModule { }
