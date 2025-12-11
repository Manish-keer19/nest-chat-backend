import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteMessageDto {
    @ApiProperty({
        description: 'ID of the user requesting the deletion',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class EditMessageDto {
    @ApiProperty({
        description: 'ID of the user requesting the edit',
        example: 'user-uuid-1',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'New text content for the message',
        example: 'Updated message text',
    })
    @IsString()
    @IsNotEmpty()
    text: string;
}
