import { NextResponse } from 'next/server';

const SPA_ROUTES = ['/chats', '/projects', '/scripts'];

export function middleware(req) {
  if (SPA_ROUTES.includes(req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.rewrite(url);
  }
}
