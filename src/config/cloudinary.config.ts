import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from './logger.config';

/**
 * PRODUCTION-GRADE CLOUDINARY CONFIGURATION
 * 
 * Features:
 * - Environment-based credentials
 * - Validation of required config
 * - Singleton pattern via provider
 * - Type-safe configuration
 */

const logger = new AppLogger('CloudinaryConfig');

/**
 * Cloudinary Provider for NestJS DI
 */
export const CloudinaryProvider = {
    provide: 'CLOUDINARY',
    useFactory: (configService: ConfigService) => {
        const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

        // Validate required environment variables
        if (!cloudName || !apiKey || !apiSecret) {
            const missing = [];
            if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
            if (!apiKey) missing.push('CLOUDINARY_API_KEY');
            if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

            throw new Error(
                `Missing required Cloudinary configuration: ${missing.join(', ')}. ` +
                `Please check your .env file.`
            );
        }

        // Configure Cloudinary
        const config = cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true, // Always use HTTPS
        });

        logger.log(`Cloudinary configured for cloud: ${cloudName}`);

        return config;
    },
    inject: [ConfigService],
};

export default cloudinary;
