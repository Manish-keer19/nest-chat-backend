import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class CreatePrivateConversationDto {
    @ApiProperty({
        description: 'ID of the first user',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    user1Id: string;

    @ApiProperty({
        description: 'ID of the second user',
        example: 'user-uuid-2',
    })
    @IsString()
    @IsNotEmpty()
    user2Id: string;
}

export class CreateGroupConversationDto {
    @ApiProperty({
        description: 'Name of the group',
        example: 'Project Team',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Array of user IDs to add to the group',
        example: ['user-uuid-1', 'user-uuid-2', 'user-uuid-3'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    userIds: string[];

    @ApiProperty({
        description: 'ID of the group owner',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    ownerId: string;
}
