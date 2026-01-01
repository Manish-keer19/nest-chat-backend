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

    const data = await this.prismaService.$queryRaw`
      select * from "User" where email = ${dto.email}`
      console.log("data is",data);

    const user = data[0];

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
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      tokens,
    };
  }

  async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role: role as any };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '30d',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '50d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    return { accessToken, refreshToken };
  }

  async validateOAuthUser(profile: any) {
    const { email, username, avatarUrl, provider, providerId } = profile;

    // Check if user exists by email
    let user = await this.prismaService.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create new user
    if (!user) {
      // Generate unique username if needed
      let finalUsername = username;
      let counter = 1;

      while (await this.prismaService.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${username}${counter}`;
        counter++;
      }

      user = await this.prismaService.user.create({
        data: {
          email,
          username: finalUsername,
          avatarUrl,
          provider,
          providerId,
          // No password needed for OAuth users
        },
      });
    } else {
      // Update avatar and provider info if changed
      if (user.avatarUrl !== avatarUrl || user.provider !== provider) {
        user = await this.prismaService.user.update({
          where: { id: user.id },
          data: {
            avatarUrl,
            provider,
            providerId,
          },
        });
      }
    }

    // Generate JWT token
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      tokens
    };
  }

}