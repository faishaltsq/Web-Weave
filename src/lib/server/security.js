export function validateOrigin(req) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (!appUrl) return true;
  const isSameOrigin = (header) => header && (header.startsWith(appUrl) || header === appUrl);
  if (origin && !isSameOrigin(origin)) return false;
  if (!origin && referer && !isSameOrigin(referer)) return false;
  return true;
}
