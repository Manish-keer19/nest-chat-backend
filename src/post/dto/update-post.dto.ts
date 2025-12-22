import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {

    @ApiProperty({
        description: 'The title of the post',
        example: 'Updated Post Title',
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({
        description: 'The content/body of the post',
        example: 'This is the updated content of the post.',
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    content?: string;
}
