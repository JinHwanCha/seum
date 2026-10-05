const { loadEnvConfig } = require('@next/env');

function getDispatchUrl(secret, server) {
  if (!secret) throw new Error('PUSH_DISPATCH_SECRET is missing in .env.local.');
  if (secret.length < 32) throw new Error('PUSH_DISPATCH_SECRET must contain at least 32 characters. Use the same value in local env, Vercel and Supabase Vault.');
  if (!server) throw new Error('Set PUSH_SERVER_URL in .env.local to the deployed SEUM server.');
  let url;
  try { url = new URL('/api/push/dispatch', server); }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error('PUSH_SERVER_URL is not a valid absolute URL.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Push worker requests require HTTPS outside localhost.');
  }
  return url;
}

function rejectRedirect(response, url) {
  if (response.status < 300 || response.status >= 400) return;
  const location = response.headers.get('location');
  if (location && new URL(location, url).pathname === '/login') {
    throw new Error('Push API redirected to /login. Deploy the current middleware and /api/push/dispatch route to Vercel; this worker uses a server secret, not a browser login.');
  }
  throw new Error(`Push API redirected (HTTP ${response.status}). Set PUSH_SERVER_URL to the canonical deployment URL.`);
}

async function dispatch() {
  loadEnvConfig(process.cwd());
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const server = process.env.PUSH_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL;
  const url = getDispatchUrl(secret, server);
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(65000), redirect: 'manual',
  });
  rejectRedirect(response, url);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Push worker returned HTTP ${response.status} without JSON. Check deployment and server URL.`);
  }
  const body = await response.json();
  if (response.status === 401) throw new Error('Push worker rejected the secret (HTTP 401). Update Vercel and Supabase Vault to match the current .env.local secret and redeploy.');
  if (!response.ok) throw new Error(body?.error || `Push worker failed: HTTP ${response.status}`);
  if (!Array.isArray(body.results)) throw new Error('Push worker returned an invalid result.');
  console.log(`Claimed ${body.claimed} Push jobs.`);
  for (const result of body.results) console.log(`${result.id}: ${result.outcome}${result.error ? ` (${result.error})` : ''}`);
  if (body.results.some((result) => !['sent', 'cancelled'].includes(result.outcome))) {
    throw new Error('Some Push jobs failed or were scheduled for retry. Check server configuration and push_jobs.');
  }
}

module.exports = { getDispatchUrl, rejectRedirect };

if (require.main === module) {
  dispatch().catch((error) => {
    console.error('Push dispatch failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
