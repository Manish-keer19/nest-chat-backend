# 🌟 Complete Cloudinary Setup Guide for NestJS

## 📚 Table of Contents
1. [What is Cloudinary?](#what-is-cloudinary)
2. [Why Use Cloudinary?](#why-use-cloudinary)
3. [Setup Process](#setup-process)
4. [How It Works](#how-it-works)
5. [Implementation Details](#implementation-details)
6. [Database Integration](#database-integration)
7. [Complete Flow Diagram](#complete-flow-diagram)

---

## 🎯 What is Cloudinary?

**Cloudinary** is a cloud-based media management platform that provides:
- **Image & Video Upload**: Store media files in the cloud
- **Automatic Optimization**: Compress and optimize images/videos
- **Transformations**: Resize, crop, apply effects on-the-fly
- **CDN Delivery**: Fast global content delivery
- **Secure URLs**: Protected media access

### Real-Life Analogy 🏪
Think of Cloudinary as a **professional photo studio with a warehouse**:
- You give them your photos/videos (upload)
- They store them safely (cloud storage)
- They can edit them on demand (transformations)
- They deliver them quickly worldwide (CDN)
- You just keep the receipt/address (URL in database)

---

## 💡 Why Use Cloudinary?

### Without Cloudinary ❌
```
User uploads image → Stored on your server → Takes up disk space
                   → Slow to serve → No optimization
                   → Hard to scale → Manual backups needed
```

### With Cloudinary ✅
```
User uploads image → Sent to Cloudinary → Stored in cloud
                   → Auto-optimized → Fast CDN delivery
                   → Unlimited storage → Automatic backups
                   → You only store URL in database
```

### Benefits:
1. **Save Server Space**: Don't store files on your server
2. **Fast Delivery**: CDN ensures quick loading worldwide
3. **Auto Optimization**: Images/videos are compressed automatically
4. **Easy Transformations**: Resize, crop, filter on-the-fly
5. **Scalability**: Handle millions of files effortlessly

---

## 🚀 Setup Process

### Step 1: Create Cloudinary Account

1. Go to [Cloudinary.com](https://cloudinary.com)
2. Sign up for a **FREE account**
3. After login, go to **Dashboard**
4. You'll see your credentials:

```
Cloud Name: your-cloud-name
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz
```

### Step 2: Install Required Packages

```bash
npm install cloudinary multer
npm install --save-dev @types/multer
```

**What are these packages?**
- `cloudinary`: Official Cloudinary SDK for Node.js
- `multer`: Middleware for handling file uploads in Express/NestJS
- `@types/multer`: TypeScript types for Multer

### Step 3: Add Environment Variables

Add to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

⚠️ **IMPORTANT**: Never commit `.env` to Git! Keep these credentials secret.

---

## 🔧 How It Works

### The Upload Flow

```
┌─────────────┐
│   Client    │ (Browser/Mobile App)
│  (Frontend) │
└──────┬──────┘
       │ 1. User selects file (image/video)
       │ 2. Sends multipart/form-data request
       ▼
┌─────────────────────────────────────────────┐
│         NestJS Backend (Your Server)        │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Upload Controller                   │  │
│  │  - Receives file via Multer          │  │
│  │  - Validates file type & size        │  │
│  └────────────┬─────────────────────────┘  │
│               │ 3. Passes file to service  │
│               ▼                             │
│  ┌──────────────────────────────────────┐  │
│  │  Upload Service                      │  │
│  │  - Uploads file to Cloudinary        │  │
│  │  - Gets back URL & metadata          │  │
│  └────────────┬─────────────────────────┘  │
│               │ 4. Returns Cloudinary URL  │
└───────────────┼─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│           Cloudinary Cloud                  │
│  - Stores the file                          │
│  - Optimizes it                             │
│  - Returns public URL                       │
│  - Makes it available via CDN               │
└────────────┬────────────────────────────────┘
             │ 5. File is now accessible
             ▼
┌─────────────────────────────────────────────┐
│         PostgreSQL Database                 │
│  - Store only the URL string                │
│  - Store metadata (type, size, etc.)        │
│                                             │
│  Attachment Table:                          │
│  ┌──────────────────────────────────────┐  │
│  │ id: uuid                             │  │
│  │ url: "https://res.cloudinary..."     │  │
│  │ key: "folder/filename"               │  │
│  │ type: "IMAGE"                        │  │
│  │ mimeType: "image/jpeg"               │  │
│  │ size: 245678                         │  │
│  │ postId: "post-uuid"                  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Concepts:

1. **File Upload (Multer)**:
   - Multer intercepts the file from the HTTP request
   - Temporarily holds it in memory
   - Passes it to your service

2. **Cloudinary Upload**:
   - Your service sends the file to Cloudinary
   - Cloudinary stores it and returns a URL
   - This URL is permanent and publicly accessible

3. **Database Storage**:
   - You DON'T store the actual file in the database
   - You ONLY store the URL string
   - Also store metadata (type, size, etc.)

---

## 📁 Implementation Details

### File Structure

```
backend/
├── src/
│   ├── upload/
│   │   ├── upload.module.ts
│   │   ├── upload.service.ts
│   │   ├── upload.controller.ts
│   │   └── dto/
│   │       └── upload-response.dto.ts
│   ├── config/
│   │   └── cloudinary.config.ts
│   └── ...
├── .env
└── ...
```

### Configuration Explained

**cloudinary.config.ts**:
```typescript
import { v2 as cloudinary } from 'cloudinary';

// This configures the Cloudinary SDK with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

### Service Explained

**upload.service.ts**:
```typescript
// This service handles the actual upload to Cloudinary
async uploadFile(file: Express.Multer.File, folder: string) {
  // Convert file buffer to base64 (Cloudinary format)
  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: folder,  // Organize files in folders
    resource_type: 'auto',  // Auto-detect image/video
  });

  // Return the URL and metadata
  return {
    url: result.secure_url,  // HTTPS URL
    publicId: result.public_id,  // Unique ID
    format: result.format,
    resourceType: result.resource_type,
  };
}
```

### Controller Explained

**upload.controller.ts**:
```typescript
@Post('image')
@UseInterceptors(FileInterceptor('file'))  // 'file' is the form field name
async uploadImage(@UploadedFile() file: Express.Multer.File) {
  // Validate file
  if (!file) throw new BadRequestException('No file provided');
  
  // Upload to Cloudinary
  const result = await this.uploadService.uploadFile(file, 'posts');
  
  // Save to database
  const attachment = await this.prisma.attachment.create({
    data: {
      url: result.url,
      key: result.publicId,
      type: 'IMAGE',
      mimeType: file.mimetype,
      size: file.size,
    },
  });
  
  return attachment;
}
```

---

## 💾 Database Integration

### Your Current Schema

You already have an `Attachment` model:

```prisma
model Attachment {
  id        String    @id @default(uuid())
  url       String    // Cloudinary URL stored here
  key       String    // Cloudinary public_id
  type      MediaType // IMAGE, VIDEO, FILE, AUDIO
  mimeType  String    // image/jpeg, video/mp4, etc.
  size      Int       // File size in bytes
  postId    String?   // Link to Post
  messageId String?   // Link to Message
  createdAt DateTime  @default(now())
  message   Message?  @relation(fields: [messageId], references: [id])
  post      Post?     @relation(fields: [postId], references: [id])
}
```

### How Data Flows to Database

1. **User uploads image** → Controller receives it
2. **Upload to Cloudinary** → Get URL back
3. **Save to database**:

```typescript
const attachment = await prisma.attachment.create({
  data: {
    url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/posts/abc123.jpg',
    key: 'posts/abc123',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    size: 245678,
    postId: 'some-post-uuid',  // Optional: link to a post
  },
});
```

4. **Return to client**:
```json
{
  "id": "attachment-uuid",
  "url": "https://res.cloudinary.com/demo/image/upload/v1234567890/posts/abc123.jpg",
  "type": "IMAGE"
}
```

### Creating a Post with Image

```typescript
// 1. Upload image first
POST /upload/image
Body: multipart/form-data with 'file' field
Response: { id: 'att-123', url: 'https://...', ... }

// 2. Create post with attachment
POST /posts
Body: {
  title: 'My Post',
  content: 'Check out this image!',
  attachmentIds: ['att-123']  // Link the uploaded attachment
}
```

---

## 🎨 Complete Flow Diagram

### Scenario: User Creates a Post with an Image

```
┌──────────────────────────────────────────────────────────────┐
│                    STEP 1: UPLOAD IMAGE                      │
└──────────────────────────────────────────────────────────────┘

Frontend                    Backend                  Cloudinary
   │                           │                          │
   │ POST /upload/image        │                          │
   │ (multipart/form-data)     │                          │
   ├──────────────────────────>│                          │
   │                           │                          │
   │                           │ Upload file              │
   │                           ├─────────────────────────>│
   │                           │                          │
   │                           │ Return URL & metadata    │
   │                           │<─────────────────────────┤
   │                           │                          │
   │                           │ Save to DB:              │
   │                           │ - url                    │
   │                           │ - key                    │
   │                           │ - type                   │
   │                           │ - size                   │
   │                           │                          │
   │ Response: attachment data │                          │
   │<──────────────────────────┤                          │
   │                           │                          │

┌──────────────────────────────────────────────────────────────┐
│                    STEP 2: CREATE POST                       │
└──────────────────────────────────────────────────────────────┘

Frontend                    Backend                  Database
   │                           │                          │
   │ POST /posts               │                          │
   │ {                         │                          │
   │   title: "...",           │                          │
   │   content: "...",         │                          │
   │   attachmentIds: [...]    │                          │
   │ }                         │                          │
   ├──────────────────────────>│                          │
   │                           │                          │
   │                           │ Create Post              │
   │                           ├─────────────────────────>│
   │                           │                          │
   │                           │ Link Attachments         │
   │                           ├─────────────────────────>│
   │                           │                          │
   │                           │ Return Post with images  │
   │                           │<─────────────────────────┤
   │                           │                          │
   │ Response: post data       │                          │
   │<──────────────────────────┤                          │
   │                           │                          │

┌──────────────────────────────────────────────────────────────┐
│                    STEP 3: DISPLAY POST                      │
└──────────────────────────────────────────────────────────────┘

Frontend                    Cloudinary CDN
   │                           │
   │ Render post with          │
   │ <img src="cloudinary-url">│
   ├──────────────────────────>│
   │                           │
   │ Image delivered fast      │
   │<──────────────────────────┤
   │                           │
```

---

## 🔍 Common Use Cases

### 1. Upload Profile Avatar

```typescript
// Controller
@Post('avatar')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('avatar'))
async uploadAvatar(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: User,
) {
  // Upload to Cloudinary
  const result = await this.uploadService.uploadFile(file, 'avatars');
  
  // Update user's avatarUrl
  await this.prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: result.url },
  });
  
  return { avatarUrl: result.url };
}
```

### 2. Upload Multiple Images for a Post

```typescript
// Controller
@Post('post-images')
@UseInterceptors(FilesInterceptor('images', 10))  // Max 10 images
async uploadPostImages(@UploadedFiles() files: Express.Multer.File[]) {
  const attachments = [];
  
  for (const file of files) {
    const result = await this.uploadService.uploadFile(file, 'posts');
    
    const attachment = await this.prisma.attachment.create({
      data: {
        url: result.url,
        key: result.publicId,
        type: 'IMAGE',
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    
    attachments.push(attachment);
  }
  
  return attachments;
}
```

### 3. Upload Video

```typescript
// Controller
@Post('video')
@UseInterceptors(FileInterceptor('video'))
async uploadVideo(@UploadedFile() file: Express.Multer.File) {
  // Validate video
  if (!file.mimetype.startsWith('video/')) {
    throw new BadRequestException('Only video files allowed');
  }
  
  // Upload to Cloudinary (videos can be large, may take time)
  const result = await this.uploadService.uploadFile(file, 'videos');
  
  // Save to database
  const attachment = await this.prisma.attachment.create({
    data: {
      url: result.url,
      key: result.publicId,
      type: 'VIDEO',
      mimeType: file.mimetype,
      size: file.size,
    },
  });
  
  return attachment;
}
```

---

## 🛡️ Best Practices

### 1. File Validation

```typescript
// Validate file size (e.g., max 5MB for images)
if (file.size > 5 * 1024 * 1024) {
  throw new BadRequestException('File too large (max 5MB)');
}

// Validate file type
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}
```

### 2. Error Handling

```typescript
try {
  const result = await this.uploadService.uploadFile(file, 'posts');
  return result;
} catch (error) {
  console.error('Cloudinary upload failed:', error);
  throw new InternalServerErrorException('Failed to upload file');
}
```

### 3. Delete Old Files

```typescript
// When deleting a post, also delete its attachments from Cloudinary
async deletePost(postId: string) {
  // Get attachments
  const attachments = await this.prisma.attachment.findMany({
    where: { postId },
  });
  
  // Delete from Cloudinary
  for (const attachment of attachments) {
    await cloudinary.uploader.destroy(attachment.key);
  }
  
  // Delete from database
  await this.prisma.post.delete({ where: { id: postId } });
}
```

### 4. Organize Files in Folders

```typescript
// Use descriptive folder names
await this.uploadService.uploadFile(file, 'posts');      // For post images
await this.uploadService.uploadFile(file, 'avatars');    // For user avatars
await this.uploadService.uploadFile(file, 'messages');   // For chat attachments
```

---

## 📊 Summary

### What You Store in Database:
- ✅ **URL** (string): The Cloudinary URL
- ✅ **Key** (string): Cloudinary public_id (for deletion)
- ✅ **Type** (enum): IMAGE, VIDEO, FILE, AUDIO
- ✅ **MimeType** (string): image/jpeg, video/mp4, etc.
- ✅ **Size** (number): File size in bytes
- ❌ **NOT the actual file bytes**

### What Cloudinary Stores:
- ✅ The actual image/video file
- ✅ Optimized versions
- ✅ Metadata

### The Flow:
1. User uploads file → Your backend
2. Backend uploads to Cloudinary → Gets URL
3. Backend saves URL to database
4. Frontend displays image using the URL
5. Cloudinary serves the image via CDN (fast!)

---

## 🎓 Next Steps

1. ✅ Install packages: `npm install cloudinary multer`
2. ✅ Set up Cloudinary account and get credentials
3. ✅ Add credentials to `.env`
4. ✅ Create upload module, service, and controller
5. ✅ Test uploading an image
6. ✅ Integrate with posts/messages
7. ✅ Add file validation
8. ✅ Implement delete functionality

**You're now ready to handle media uploads like a pro!** 🚀
