import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

/**
 * Cloudinary resource types
 */
export type CloudinaryResourceType = 'image' | 'video' | 'raw';

/**
 * Internal upload result interface
 */
export interface UploadResult {
    url: string;
    publicId: string;
    resourceType: CloudinaryResourceType;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
}

/**
 * Cloudinary upload options
 */
export interface CloudinaryUploadOptions {
    folder: string;
    resourceType: CloudinaryResourceType;
    transformation?: any[];
    allowedFormats?: string[];
}

/**
 * Type guard for Cloudinary upload response
 */
export function isUploadApiResponse(
    response: UploadApiResponse | UploadApiErrorResponse,
): response is UploadApiResponse {
    return 'secure_url' in response && 'public_id' in response;
}
