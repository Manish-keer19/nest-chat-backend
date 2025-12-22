import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePostDto {

    @ApiProperty({
        description: 'The title of the post',
        example: 'My First Post',
        type: String,
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'The content/body of the post',
        example: 'This is the content of my first post. It can be a long text.',
        type: String,
    })
    @IsString()
    content: string;

}
