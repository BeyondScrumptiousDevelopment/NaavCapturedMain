/**
 * GET /api/instagram — the latest @naavcaptured posts for the "recent work" row.
 *
 * Runs as a Cloudflare Pages Function (free). It asks Instagram for the newest posts using
 * the account's access token, keeps only what the page needs, and caches the answer for
 * 15 minutes so Instagram is asked at most a few times an hour.
 *
 * Setup (see README → "Live Instagram feed"):
 *   INSTAGRAM_TOKEN  secret: a long-lived Instagram access token (Instagram API with Instagram Login).
 *   IG               optional KV namespace binding. With it, the token renews itself every week,
 *                    so it never hits Instagram's 60-day expiry. Without it, paste a new token
 *                    every 60 days.
 */

const GRAPH = 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const CACHE_SECONDS = 900;
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/instagram', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const token = await currentToken(env, waitUntil);
  if (!token) return json({ error: 'Instagram feed is not set up yet.' }, 503);

  let data;
  try {
    const r = await fetch(`${GRAPH}/me/media?fields=${FIELDS}&limit=12&access_token=${encodeURIComponent(token)}`);
    if (!r.ok) return json({ error: `Instagram answered ${r.status}. The token may have expired.` }, 502);
    data = await r.json();
  } catch (e) {
    return json({ error: 'Could not reach Instagram.' }, 502);
  }

  const posts = (data.data || [])
    .map((p) => ({
      href: p.permalink,
      image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      caption: firstLine(p.caption),
      type: p.media_type,               // IMAGE, VIDEO (reels) or CAROUSEL_ALBUM
      date: p.timestamp
    }))
    .filter((p) => p.href && p.image)
    .slice(0, 6);

  const res = json({ posts }, 200, `public, max-age=${CACHE_SECONDS}`);
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function currentToken(env, waitUntil) {
  if (!env.IG) return env.INSTAGRAM_TOKEN || null;

  let saved = null;
  try { saved = await env.IG.get('token', 'json'); } catch (e) {}
  const token = (saved && saved.token) || env.INSTAGRAM_TOKEN;
  if (!token) return null;

  const age = saved ? Date.now() - saved.at : Infinity;
  if (age > REFRESH_AFTER_MS) waitUntil(refresh(env, token));
  return token;
}

async function refresh(env, token) {
  try {
    const r = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    if (!r.ok) return;
    const { access_token } = await r.json();
    if (access_token) await env.IG.put('token', JSON.stringify({ token: access_token, at: Date.now() }));
  } catch (e) { /* try again on a later request */ }
}

function firstLine(caption) {
  if (!caption) return '';
  const line = caption.split('\n')[0].trim();
  return line.length > 120 ? line.slice(0, 117) + '…' : line;
}

function json(body, status, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl }
  });
}
