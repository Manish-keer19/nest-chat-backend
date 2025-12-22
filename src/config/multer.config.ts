import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * PRODUCTION-GRADE MULTER CONFIGURATION
 * 
 * Security Features:
 * - Memory storage (no disk writes)
 * - Strict file size limits per type
 * - MIME type validation (no trust in extensions)
 * - Prevents malicious file uploads
 */

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024,      // 10MB for images
    VIDEO: 100 * 1024 * 1024,     // 100MB for videos
    DOCUMENT: 20 * 1024 * 1024,   // 20MB for documents
};

// Allowed MIME types by category
const ALLOWED_MIME_TYPES = {
    IMAGE: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
    ],
    VIDEO: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm',
    ],
    DOCUMENT: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-zip-compressed',
        'text/plain',
    ],
};

// Flatten all allowed MIME types
const ALL_ALLOWED_MIME_TYPES = [
    ...ALLOWED_MIME_TYPES.IMAGE,
    ...ALLOWED_MIME_TYPES.VIDEO,
    ...ALLOWED_MIME_TYPES.DOCUMENT,
];

/**
 * Determine file category based on MIME type
 */
export const getFileCategory = (mimetype: string): 'IMAGE' | 'VIDEO' | 'DOCUMENT' => {
    if (ALLOWED_MIME_TYPES.IMAGE.includes(mimetype)) return 'IMAGE';
    if (ALLOWED_MIME_TYPES.VIDEO.includes(mimetype)) return 'VIDEO';
    if (ALLOWED_MIME_TYPES.DOCUMENT.includes(mimetype)) return 'DOCUMENT';

    throw new BadRequestException(
        `Unsupported file type: ${mimetype}. Allowed types: images, videos, documents.`
    );
};

/**
 * Get maximum file size for a given MIME type
 */
export const getMaxFileSize = (mimetype: string): number => {
    const category = getFileCategory(mimetype);
    return FILE_SIZE_LIMITS[category];
};

/**
 * File filter: validates MIME type
 * SECURITY: Never trust file extensions - always validate MIME type
 */
const fileFilter = (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
) => {
    // Validate MIME type
    if (!ALL_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return callback(
            new BadRequestException(
                `Invalid file type: ${file.mimetype}. Allowed: images, videos, PDF, DOC, ZIP.`
            ),
            false,
        );
    }

    callback(null, true);
};

/**
 * Multer configuration for production
 */
export const multerConfig: MulterOptions = {
    storage: memoryStorage(), // Store in memory (no disk writes)
    fileFilter,
    limits: {
        fileSize: Math.max(...Object.values(FILE_SIZE_LIMITS)), // Max possible size
        files: 10, // Max 10 files per request
    },
};

/**
 * Validate individual file size based on its type
 * Call this AFTER multer processes the file
 */
export const validateFileSize = (file: Express.Multer.File): void => {
    const maxSize = getMaxFileSize(file.mimetype);

    if (file.size > maxSize) {
        throw new BadRequestException(
            `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. ` +
            `Maximum allowed for ${file.mimetype}: ${(maxSize / 1024 / 1024).toFixed(0)}MB.`
        );
    }
};
