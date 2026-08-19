import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'mediShop API Documentation',
      version: '1.0.0',
      description:
        'Production-grade RESTful API blueprint for mediShop online pharmacy platform in Bangladesh.',
      contact: {
        name: 'mediShop Engineering Team',
        email: 'support@medishop.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide access token in format: Bearer <JWT_TOKEN>',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.route.ts', './src/modules/**/*.routes.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
