import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Background Job Scheduler API')
    .setDescription('The API documentation for the Background Job Scheduler')
    .setVersion('1.0')
    .addBearerAuth() // Optional: Adds JWT Authentication button to Swagger
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService<Env, true>);
  await app.listen(configService.get('PORT', { infer: true }));
}
bootstrap().catch((err: unknown) => {
  console.error('Error during bootstrap:', err);
});
