import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGroupIconDto {
    @ApiProperty({ description: 'User ID making the request (must be group owner)', example: 'user-uuid-1' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'New icon URL for the group', example: 'https://cloudinary.com/group-icon.jpg' })
    @IsString()
    @IsNotEmpty()
    iconUrl: string;
}

export class UpdateGroupNameDto {
    @ApiProperty({ description: 'User ID making the request (must be group owner)', example: 'user-uuid-1' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'New name for the group', example: 'Updated Team Name' })
    @IsString()
    @IsNotEmpty()
    name: string;
}
