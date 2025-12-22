import { ApiProperty } from '@nestjs/swagger';

/**
 * Upload Response DTO
 * Type-safe response for file upload operations
 */
export class UploadResponseDto {
    @ApiProperty({
        description: 'Secure HTTPS URL of the uploaded file',
        example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg',
    })
    url: string;

    @ApiProperty({
        description: 'Cloudinary public ID (used for deletion/transformation)',
        example: 'folder/file_abc123',
    })
    publicId: string;

    @ApiProperty({
        description: 'File type category',
        enum: ['image', 'video', 'raw'],
        example: 'image',
    })
    resourceType: 'image' | 'video' | 'raw';

    @ApiProperty({
        description: 'Original filename',
        example: 'profile-picture.jpg',
    })
    originalName: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 2048576,
    })
    size: number;

    @ApiProperty({
        description: 'MIME type',
        example: 'image/jpeg',
    })
    mimeType: string;

    @ApiProperty({
        description: 'Upload timestamp',
        example: '2025-12-21T13:53:00.000Z',
    })
    uploadedAt: Date;
}
