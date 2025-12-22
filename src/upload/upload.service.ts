import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cloudinary from '../config/cloudinary.config';
import { getFileCategory, validateFileSize } from '../config/multer.config';
import {
    CloudinaryResourceType,
    UploadResult,
    isUploadApiResponse,
} from './interfaces/upload-result.interface';
import { UploadResponseDto } from './dto/upload-response.dto';
import { Readable } from 'stream';
import { AppLogger } from '../config/logger.config';

/**
 * PRODUCTION-GRADE UPLOAD SERVICE
 * 
 * Features:
 * - Stream-based uploads (no disk I/O)
 * - Automatic resource type detection
 * - Cloudinary optimizations (quality, format)
 * - Comprehensive error handling
 * - Folder organization
 * - Type-safe responses
 */
@Injectable()
export class UploadService {
    private readonly logger = new AppLogger(UploadService.name);
    private readonly baseFolder: string;

    constructor(private readonly configService: ConfigService) {
        this.baseFolder = this.configService.get<string>('CLOUDINARY_FOLDER') || 'social-media-app';
    }

    /**
     * Upload a single file to Cloudinary
     * 
     * @param file - Multer file from memory storage
     * @param folder - Optional subfolder (e.g., 'posts', 'avatars')
     * @returns Upload result with secure URL and metadata
     */
    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'uploads',
    ): Promise<UploadResponseDto> {
        try {
            // Validate file size based on type
            validateFileSize(file);

            // Determine resource type
            const resourceType = this.getResourceType(file.mimetype);

            // Upload to Cloudinary using stream
            const uploadResult = await this.uploadToCloudinary(
                file.buffer,
                resourceType,
                folder,
            );

            this.logger.log(
                `File uploaded successfully: ${uploadResult.publicId} (${resourceType})`,
            );

            // Map to DTO
            return {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                resourceType: uploadResult.resourceType,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException(
                `Failed to upload file: ${error.message}`,
            );
        }
    }

    /**
     * Upload multiple files to Cloudinary
     * 
     * @param files - Array of Multer files
     * @param folder - Optional subfolder
     * @returns Array of upload results
     */
    async uploadMultipleFiles(
        files: Express.Multer.File[],
        folder: string = 'uploads',
    ): Promise<UploadResponseDto[]> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        // Upload all files in parallel
        const uploadPromises = files.map((file) => this.uploadFile(file, folder));

        try {
            return await Promise.all(uploadPromises);
        } catch (error) {
            this.logger.error(`Batch upload failed: ${error.message}`);
            throw new InternalServerErrorException('Failed to upload one or more files');
        }
    }

    /**
     * Delete a file from Cloudinary
     * 
     * @param publicId - Cloudinary public ID
     * @param resourceType - Resource type (image/video/raw)
     */
    async deleteFile(
        publicId: string,
        resourceType: CloudinaryResourceType = 'image',
    ): Promise<void> {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });

            if (result.result !== 'ok') {
                throw new Error(`Deletion failed: ${result.result}`);
            }

            this.logger.log(`File deleted: ${publicId}`);
        } catch (error) {
            
            this.logger.error(`Delete failed: ${error}`);
            throw new InternalServerErrorException(
                `Failed to delete file: ${error.message}`,
            );
        }
    }

    /**
     * Upload buffer to Cloudinary using upload_stream
     * PRODUCTION: Uses streams for memory efficiency
     * 
     * @private
     */
    private uploadToCloudinary(
        buffer: Buffer,
        resourceType: CloudinaryResourceType,
        folder: string,
    ): Promise<UploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `${this.baseFolder}/${folder}`,
                    resource_type: resourceType,
                    // Production optimizations
                    quality: 'auto', // Automatic quality optimization
                    fetch_format: 'auto', // Automatic format selection (WebP, AVIF)
                    flags: 'lossy', // Enable lossy compression for smaller files
                    // Security
                    invalidate: true, // Invalidate CDN cache on update
                },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }

                    if (!result || !isUploadApiResponse(result)) {
                        return reject(new Error('Invalid upload response from Cloudinary'));
                    }

                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        resourceType: result.resource_type as CloudinaryResourceType,
                        format: result.format,
                        bytes: result.bytes,
                        width: result.width,
                        height: result.height,
                        duration: result.duration,
                    });
                },
            );

            // Convert buffer to stream and pipe to Cloudinary
            const readableStream = Readable.from(buffer);
            readableStream.pipe(uploadStream);
        });
    }

    /**
     * Determine Cloudinary resource type from MIME type
     * 
     * @private
     */
    private getResourceType(mimetype: string): CloudinaryResourceType {
        const category = getFileCategory(mimetype);

        switch (category) {
            case 'IMAGE':
                return 'image';
            case 'VIDEO':
                return 'video';
            case 'DOCUMENT':
                return 'raw'; // PDFs, ZIPs, etc.
            default:
                throw new BadRequestException(`Unsupported file category: ${category}`);
        }
    }
}
