function getUrlOrigin(value) {
  if (!value) return null;
  try {
    const normalized = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) ? value : `https://${value}`;
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

export function getRequestOrigin(req) {
  return getUrlOrigin(req.headers.get('origin'))
    || getUrlOrigin(req.headers.get('referer'))
    || getUrlOrigin(req.url)
    || getUrlOrigin(process.env.NEXT_PUBLIC_APP_URL)
    || getUrlOrigin(process.env.VERCEL_URL);
}

export function validateOrigin(req) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowedOrigins = [
    getUrlOrigin(process.env.NEXT_PUBLIC_APP_URL),
    getUrlOrigin(process.env.VERCEL_URL),
    getUrlOrigin(req.url),
  ].filter(Boolean);

  if (!allowedOrigins.length) return true;

  const isSameOrigin = (header) => {
    const headerOrigin = getUrlOrigin(header);
    return Boolean(headerOrigin && allowedOrigins.includes(headerOrigin));
  };

  if (origin && !isSameOrigin(origin)) return false;
  if (!origin && referer && !isSameOrigin(referer)) return false;
  return true;
}
