import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * Builds dynamic CORS options allowing localhost:3000 plus comma-separated
 * origins from `process.env.FRONTEND_URL`.
 */
export function getCorsOptions(): CorsOptions {
  const frontendOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set(['http://localhost:3000', ...frontendOrigins]),
  );

  return {
    origin: allowedOrigins,
    credentials: true,
  };
}
