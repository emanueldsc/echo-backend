function normalizeOrigin(origin: string, fallbackPort: string): string {
  const trimmedOrigin = origin.trim();

  if (!trimmedOrigin) {
    return '';
  }

  const candidate = trimmedOrigin.includes('://') ? trimmedOrigin : `http://${trimmedOrigin}`;

  try {
    const parsedUrl = new URL(candidate);
    const isLocalHost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';

    if (isLocalHost && !parsedUrl.port) {
      parsedUrl.port = fallbackPort;
    }

    return parsedUrl.origin;
  } catch {
    return trimmedOrigin;
  }
}

export function getFrontendOrigins(): string[] {
  const frontendOrigin = process.env.ECHO_FRONTEND_ORIGIN ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost';
  const frontendPort = process.env.ECHO_FRONT_PORT ?? '4200';

  return frontendOrigin
    .split(',')
    .map((origin) => normalizeOrigin(origin, frontendPort))
    .filter((origin) => origin.length > 0);
}