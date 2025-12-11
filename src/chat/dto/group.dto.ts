import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddUserToGroupDto {
    @ApiProperty({
        description: 'ID of the user to add to the group',
        example: 'user-uuid-3',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'ID of the user requesting the addition (must be group owner)',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    requesterId: string;
}

export class RemoveUserFromGroupDto {
    @ApiProperty({
        description: 'ID of the user to remove from the group',
        example: 'user-uuid-2',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'ID of the user requesting the removal (must be group owner)',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    requesterId: string;
}

export class DeleteConversationDto {
    @ApiProperty({
        description: 'ID of the user requesting the deletion',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}
