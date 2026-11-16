// The make.fun public API, read-only GETs, open to any origin (CORS).
// Docs: https://make.fun/api/openapi.json and https://make.fun/llms.txt
//
// Every answer is cached in memory and revalidated with its ETag: the API
// binds ETags to the minute, so a revalidation inside the same minute
// answers 304 and costs almost nothing, and a new minute answers 200 with
// a fresh tag even when nothing changed. Identical calls already in flight
// share one request. A view therefore fetches only what it shows, and
// re-visiting a view is usually a single 304 per endpoint.
//
// A failed fetch (the API down, the network gone) throws an Error carrying
// the HTTP status, so the router can show a retry instead of a blank page.

const API = 'https://make.fun/api';

// url -> { etag, data } for answers we have already seen.
const cache = new Map();

// url -> Promise for a request already in flight.
const inflight = new Map();

// Counts shown in the footer: requests sent, answers revalidated with a 304,
// and requests that failed outright.
export const stats = { sent: 0, revalidated: 0, errors: 0 };

/** Drop every cached answer, so the next view fetches fresh. */
export function clearCache() {
  cache.clear();
}

async function get(path) {
  const url = API + path;
  const seen = cache.get(url);
  if (inflight.has(url)) return inflight.get(url);

  const work = (async () => {
    const headers = {};
    if (seen?.etag) headers['If-None-Match'] = seen.etag;
    stats.sent += 1;
    let res;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      stats.errors += 1;
      const failure = new Error(`make.fun did not answer: ${err?.message || err}`);
      failure.status = 0;
      throw failure;
    }
    if (res.status === 304 && seen) {
      stats.revalidated += 1;
      return seen.data;
    }
    if (!res.ok) {
      stats.errors += 1;
      const failure = new Error(`make.fun answered ${res.status} for ${path}`);
      failure.status = res.status;
      throw failure;
    }
    const data = await res.json();
    const etag = res.headers.get('ETag');
    if (etag) cache.set(url, { etag, data });
    return data;
  })();

  inflight.set(url, work);
  try {
    return await work;
  } finally {
    inflight.delete(url);
  }
}

/** Warm the cache for one bounty in the background: hovering (or keyboard
 *  focus on) a board row fetches its page's data early, so the click that
 *  follows usually renders from cache. Failures are swallowed — a prefetch
 *  must never break the page the reader is on. */
export function prefetchBounty(slug) {
  if (!slug) return;
  get(`/competitions/${encodeURIComponent(slug)}`).catch(() => {});
}

/** The board list. `activity=times` leaves out per-bounty activity the board never shows. */
export function getBounties() {
  return get('/competitions?status=open&activity=times');
}

/** One bounty, by slug: summary, description, rules, rewards, dates, status. */
export function getBounty(slug) {
  return get(`/competitions/${encodeURIComponent(slug)}`);
}

/** That bounty's leaderboard: ranked entries with win rates. */
export function getLeaderboard(slug) {
  return get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);
}

/** That bounty's entries, newest first. The list endpoint takes a limit; asking for
 *  a bigger limit is how "show more" pages through it. */
export function getSubmissions(slug, limit = 20) {
  return get(`/competitions/${encodeURIComponent(slug)}/submissions?limit=${limit}`);
}

/** An account's public profile, by handle. */
export function getProfile(handle) {
  return get(`/profiles/${encodeURIComponent(handle)}`);
}
