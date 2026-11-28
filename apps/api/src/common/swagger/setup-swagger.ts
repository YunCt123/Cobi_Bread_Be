import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_CDN_BASE =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Cobi Bread API')
    .setDescription(
      'REST API for Cobi Bread E-commerce & Multi-Branch Operations',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Cobi Bread API Docs',
    customCssUrl: `${SWAGGER_CDN_BASE}/swagger-ui.min.css`,
    customJs: [
      `${SWAGGER_CDN_BASE}/swagger-ui-bundle.min.js`,
      `${SWAGGER_CDN_BASE}/swagger-ui-standalone-preset.min.js`,
    ],
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
