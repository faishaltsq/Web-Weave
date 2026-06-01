import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    gemini: process.env.GEMINI_API_KEY ? 'SET (' + process.env.GEMINI_API_KEY.substring(0,10) + '...)' : 'NOT SET',
    openrouter: process.env.OPENROUTER_API_KEY ? 'SET (' + process.env.OPENROUTER_API_KEY.substring(0,10) + '...)' : 'NOT SET',
    allenv: Object.keys(process.env).filter(k => k.includes('API_KEY'))
  });
}