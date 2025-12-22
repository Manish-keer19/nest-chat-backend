import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { multerConfig } from '../config/multer.config';

/**
 * PRODUCTION-GRADE UPLOAD CONTROLLER
 * 
 * Endpoints:
 * - POST /upload/single - Upload single file
 * - POST /upload/multiple - Upload multiple files
 * - DELETE /upload - Delete file by publicId
 * 
 * Features:
 * - Multer file validation
 * - Swagger documentation
 * - Proper HTTP status codes
 * - Error handling
 */
@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  /**
   * Upload a single file
   * 
   * Supports: images, videos, documents (PDF, ZIP, DOC)
   */
  @Post('single')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload a single file',
    description: 'Upload image, video, or document to Cloudinary. Max sizes: Image 10MB, Video 100MB, Document 20MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image/video/document)',
        },
        folder: {
          type: 'string',
          description: 'Optional subfolder (e.g., "posts", "avatars")',
          example: 'posts',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file type or size',
  })
  @ApiResponse({
    status: 413,
    description: 'Payload too large',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadService.uploadFile(file, folder || 'uploads');
  }

  /**
   * Upload multiple files
   * 
   * Max 10 files per request
   */
  @Post('multiple')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload up to 10 files at once. Supports images, videos, and documents.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10)',
        },
        folder: {
          type: 'string',
          description: 'Optional subfolder',
          example: 'posts',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: [UploadResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid files',
  })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.uploadService.uploadMultipleFiles(files, folder || 'uploads');
  }

  /**
   * Delete a file from Cloudinary
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from Cloudinary using its public ID',
  })
  @ApiQuery({
    name: 'publicId',
    description: 'Cloudinary public ID',
    example: 'social-media-app/posts/abc123',
  })
  @ApiQuery({
    name: 'resourceType',
    description: 'Resource type',
    enum: ['image', 'video', 'raw'],
    required: false,
  })
  @ApiResponse({
    status: 204,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing publicId',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to delete file',
  })
  async deleteFile(
    @Query('publicId') publicId: string,
    @Query('resourceType') resourceType?: 'image' | 'video' | 'raw',
  ): Promise<void> {
    if (!publicId) {
      throw new BadRequestException('publicId is required');
    }

    await this.uploadService.deleteFile(publicId, resourceType || 'image');
  }
}

