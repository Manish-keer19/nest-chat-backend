import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: 'Username', example: 'john_doe' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string;

    @ApiPropertyOptional({ description: 'User bio', example: 'Full stack developer' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;

    @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://cloudinary.com/image.jpg' })
    @IsOptional()
    @IsString()
    avatarUrl?: string;
}
