/**
 * GET /api/instagram — the latest @naavcaptured posts for the "recent work" row.
 *
 * Runs as a Cloudflare Pages Function (free). It asks Instagram for the newest posts using
 * the account's access token, keeps only what the page needs, and caches the answer for
 * 15 minutes so Instagram is asked at most a few times an hour.
 *
 * Works with either kind of token Meta's dashboard hands out:
 *   - Instagram login token (starts "IG"): read from graph.instagram.com, renewed weekly if
 *     the IG KV binding exists (these expire after 60 days).
 *   - Unified login / Facebook token (starts "EAA"): read from graph.facebook.com. The
 *     Instagram account is found from the token, or set INSTAGRAM_USER_ID to skip that step.
 *
 * Setup (see README → "Live Instagram feed"):
 *   INSTAGRAM_TOKEN    secret: the access token.
 *   INSTAGRAM_USER_ID  optional: the Instagram account's numeric ID (Unified login tokens only).
 *   IG                 optional KV namespace binding, for renewing Instagram login tokens.
 */

const IG_GRAPH = 'https://graph.instagram.com';
const FB_GRAPH = 'https://graph.facebook.com/v25.0';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const CACHE_SECONDS = 900;
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function onRequestGet(context) {
  try {
    return await feed(context);
  } catch (e) {
    return problem('Feed crashed: ' + String(e && e.message || e));
  }
}

async function feed({ request, env, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/instagram', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const token = await currentToken(env, waitUntil);
  if (!token) return problem('Instagram feed is not set up yet: no INSTAGRAM_TOKEN.');

  let items;
  try {
    items = isInstagramToken(token)
      ? await graph(`${IG_GRAPH}/me/media?fields=${FIELDS}&limit=12`, token)
      : await facebookMedia(token, env);
    items = items.data || [];
  } catch (e) {
    return problem(String(e.message || e));
  }

  const posts = items
    .map((p) => ({
      href: p.permalink,
      image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      caption: firstLine(p.caption),
      type: p.media_type,               // IMAGE, VIDEO (reels) or CAROUSEL_ALBUM
      date: p.timestamp
    }))
    .filter((p) => p.href && p.image)
    .slice(0, 6);

  if (!posts.length) return problem(items.length ? 'Instagram sent posts but none had an image link.' : 'Instagram sent no posts for this account.');
  const res = json({ posts }, 200, `public, max-age=${CACHE_SECONDS}`);
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

function isInstagramToken(token) {
  return /^IG/.test(token);
}

/* ---------- Unified login / Facebook tokens ---------- */

async function facebookMedia(token, env) {
  const id = env.INSTAGRAM_USER_ID || await findInstagramAccount(token);
  return graph(`${FB_GRAPH}/${encodeURIComponent(id)}/media?fields=${FIELDS}&limit=12`, token);
}

// Finds the Instagram account the token can read, trying each place Meta may list it.
async function findInstagramAccount(token) {
  const tries = [
    async () => (await graph(`${FB_GRAPH}/me/assigned_instagram_accounts?fields=id,username`, token)).data?.[0]?.id,
    async () => {
      const pages = (await graph(`${FB_GRAPH}/me/accounts?fields=instagram_business_account`, token)).data || [];
      return pages.map((p) => p.instagram_business_account?.id).find(Boolean);
    },
  ];
  const problems = [];
  for (const attempt of tries) {
    try {
      const id = await attempt();
      if (id) return id;
    } catch (e) { problems.push(e.message); }
  }
  let granted = '';
  try {
    const perms = (await graph(`${FB_GRAPH}/me/permissions`, token)).data || [];
    granted = perms.filter((p) => p.status === 'granted').map((p) => p.permission).join(', ');
  } catch (e) { granted = 'unknown (' + e.message + ')'; }
  throw new Error('Meta lists no Instagram account for this token. Set INSTAGRAM_USER_ID in Cloudflare, '
    + 'or add the business_management permission to the login configuration and generate a new token. '
    + 'Token permissions: ' + (granted || 'none') + '.'
    + (problems.length ? ' Meta said: ' + problems.join(' | ') : ''));
}

/* ---------- shared ---------- */

async function graph(url, token) {
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(`${url}${sep}access_token=${encodeURIComponent(token)}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) {
    const msg = body.error ? `${body.error.message} (code ${body.error.code})` : `HTTP ${r.status}`;
    throw new Error(`Instagram answered: ${msg}`);
  }
  return body;
}

async function currentToken(env, waitUntil) {
  const fallback = env.INSTAGRAM_TOKEN || null;
  if (!env.IG || !fallback || !isInstagramToken(fallback)) return fallback;

  let saved = null;
  try { saved = await env.IG.get('token', 'json'); } catch (e) {}
  const token = (saved && saved.token) || fallback;

  const age = saved ? Date.now() - saved.at : Infinity;
  if (age > REFRESH_AFTER_MS) waitUntil(refresh(env, token));
  return token;
}

async function refresh(env, token) {
  try {
    const r = await fetch(`${IG_GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
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

// Answer 200 with an explanation so Cloudflare doesn't swap it for a bare error page;
// the page treats an empty list as "use the backup tiles".
function problem(message) {
  return json({ posts: [], error: message }, 200);
}

function json(body, status, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl }
  });
}
