import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prismaService: PrismaService,
  ) {}

  async signup(dto: SignUpDto) {
    dto.password = await bcrypt.hash(dto.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: dto.username,
        password: dto.password,
        email: dto.email,
      },
    });
    return user;
  }

  async login(dto: LoginDto) {
    // 1. Check if user exists
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found'); // 404
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials'); // 401
    }

    // 3. Generate tokens
    const tokens = await this.generateTokens(
      parseInt(user.id),
      user.email,
      user.role || 'USER',
    );

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      tokens,
    };
  }

  async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '30m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    return { accessToken, refreshToken };
  }
}
