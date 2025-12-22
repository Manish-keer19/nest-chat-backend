import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prismaService: PrismaService,
  ) { }

  async signup(dto: SignUpDto) {
    dto.password = await bcrypt.hash(dto.password, 10);

    // const user = await this.prismaService.user.create({
    //   data: {
    //     username: dto.username,
    //     password: dto.password,
    //     email: dto.email,
    //   },
    // });


    const id = crypto.randomUUID();
    const [user] = await this.prismaService.$queryRaw<any[]>`
      INSERT INTO "User" (id, username, password, email, "updatedAt") 
      VALUES (${id}, ${dto.username}, ${dto.password}, ${dto.email}, NOW()) 
      RETURNING *`;

    return user;
  }

  async login(dto: LoginDto) {
    // 1. Check if user exists
    // const user = await this.prismaService.user.findUnique({
    //   where: { email: dto.email },
    // });
    
     const data  = await this.prismaService.$queryRaw`
      select * from "User" where email = ${dto.email}`

      const user= data[0];
     
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
      user.id,
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

  async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role: role as any };

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
