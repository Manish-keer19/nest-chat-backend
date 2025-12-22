import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class MarkMessageDeliveredDto {
    @ApiProperty({
        description: 'ID of the message to mark as delivered',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @ApiProperty({
        description: 'ID of the user who received the message',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class MarkMessageReadDto {
    @ApiProperty({
        description: 'ID of the message to mark as read',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @ApiProperty({
        description: 'ID of the user who read the message',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class MarkConversationReadDto {
    @ApiProperty({
        description: 'ID of the user who read the conversation',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class GetMessageStatusDto {
    @ApiProperty({
        description: 'ID of the message',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;
}
