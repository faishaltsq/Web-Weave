import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const logoPath = path.join(process.cwd(), 'LOGO.svg');
  const rawSvg = await readFile(logoPath, 'utf8');
  const innerSvg = rawSvg
    .replace(/<\?xml[^>]*>\s*/i, '')
    .replace(/^\s*<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">
  <defs>
    <clipPath id="webweave-logo-circle">
      <circle cx="627" cy="627" r="627" />
    </clipPath>
  </defs>
  <g clip-path="url(#webweave-logo-circle)">
    ${innerSvg}
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
