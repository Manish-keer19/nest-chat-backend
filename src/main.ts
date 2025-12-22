import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule as SwaggerModul } from '@nestjs/swagger';
import { AppLogger } from './config/logger.config';

async function bootstrap() {
  // Create custom logger instance
  const logger = new AppLogger('Bootstrap');

  // Create NestJS app with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger('NestApplication'),
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Manish Api') // API title
    .setDescription('Manish API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match @ApiBearerAuth('JWT-auth') in controllers
    )
    .build();

  const document = SwaggerModul.createDocument(app, config);
  SwaggerModul.setup('api', app, document); // Swagger available at /api

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  // Use custom logger for startup messages
  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
  logger.log(`📚 Swagger docs available at: ${await app.getUrl()}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();

