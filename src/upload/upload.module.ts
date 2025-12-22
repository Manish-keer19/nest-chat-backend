import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CloudinaryProvider } from '../config/cloudinary.config';

/**
 * Upload Module
 * 
 * Provides file upload functionality using Multer + Cloudinary
 */
@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, CloudinaryProvider],
  exports: [UploadService], // Export for use in other modules
})
export class UploadModule { }

