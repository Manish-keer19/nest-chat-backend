import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a comment
 * Supports both top-level comments and nested replies
 */
export class CreateCommentDto {
    @ApiProperty({
        description: 'The text content of the comment',
        example: 'This is a great post! Thanks for sharing.',
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiPropertyOptional({
        description: 'ID of the parent comment (for nested replies). Leave empty for top-level comments.',
        example: 'cm5abc123xyz',
        type: String,
    })
    @IsString()
    @IsOptional() // Optional because top-level comments don't have a parent
    parentId?: string;
}

