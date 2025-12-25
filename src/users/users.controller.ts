import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UserDto } from './dto/userDto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UploadService } from 'src/upload/upload.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users', type: [UserDto] })
  async getAllUsers(): Promise<UserDto[]> {
    return await this.usersService.getAllUsers();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getCurrentUser(@Req() req) {
    return await this.usersService.getUserById(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return await this.usersService.getUserById(id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async updateProfile(@Req() req, @Body() updateData: UpdateProfileDto) {
    return await this.usersService.updateProfile(req.user.sub, updateData);
  }

  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload/Update user avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  async uploadAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Upload to Cloudinary
    const result = await this.uploadService.uploadFile(file, 'avatars');

    // Update user avatar URL in database
    return await this.usersService.updateAvatar(req.user.sub, result.url);
  }
  @Post('presence')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get presence status for multiple users' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User presence status' })
  async getUsersPresence(@Body() body: { userIds: string[] }) {
    if (!body.userIds || !Array.isArray(body.userIds)) {
      throw new BadRequestException('userIds array is required');
    }
    return await this.usersService.getUsersPresence(body.userIds);
  }
}
