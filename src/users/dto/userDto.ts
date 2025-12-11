import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique ID of the user',
  })
  id: string;

  @ApiProperty({ example: 'manish123', description: 'Username of the user' })
  username: string;

  @ApiProperty({
    example: 'manish@example.com',
    description: 'Email of the user',
  })
  email: string;

  @ApiProperty({ example: 'USER', description: 'Role of the user' })
  role: string;

  @ApiPropertyOptional({
    example: 'profilePicUrl',
    description: 'Profile picture URL',
  })
  profilePic?: string;
}
