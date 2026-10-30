import { NextRequest, NextResponse } from 'next/server';

// Relais vers le backend Python : le navigateur ne parle qu'à une seule origine
export const dynamic = 'force-dynamic';

const FORWARDED = ['authorization', 'content-type', 'x-dev-user'];

async function relay(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const base = process.env.BACKEND_URL ?? 'http://localhost:8000';
  const url = `${base}/api/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
      // Le backend ne redirige pas : une redirection est renvoyée telle quelle, jamais suivie
      redirect: 'manual',
    });
    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ detail: 'Le serveur de jeu est injoignable.' }, { status: 502 });
  }
}

export { relay as GET, relay as POST, relay as PUT, relay as DELETE };
