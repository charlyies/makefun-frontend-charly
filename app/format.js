// Small helpers for showing API values. All output that lands in HTML goes
// through esc() first; the API's own markdown is rendered by views.md().

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 500 or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', '<1m left', or 'closed'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return '<1m left';
}

/** True while a bounty still takes entries. The API may still read status
 *  'open' after the deadline until results publish, so the deadline decides. */
export function stillOpen(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** '1 entry' / '290 entries'. */
export function entries(n) {
  return `${Number(n || 0).toLocaleString('en-US')} ${Number(n) === 1 ? 'entry' : 'entries'}`;
}

/** A win rate stored as micro units (950587) as '95.1%'. */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** A big count shortened for tight table cells: 1240 -> '1.2k', 3.4M stays readable. */
export function compact(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
}

/** '1st', '2nd', '3rd', '4th' … for places and ranks. */
export function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const mod100 = v % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th';
  return `${v}${suffix}`;
}

/** A leaderboard's primary score, whatever the bounty scores: a judge win rate
 *  stored as micro units (950587 -> '95.1%'), an Elo (2110 -> '2110'), or any
 *  other plain number, shown as-is. The API's `values` object differs per
 *  bounty, so the caller passes the whole object and this picks the first
 *  score it recognises, preferring the judge's win rate. */
export function score(values) {
  if (!values || typeof values !== 'object') return '—';
  if (values.judge != null) return winRate(values.judge);
  if (values.elo != null) return String(Number(values.elo));
  for (const key of ['score', 'points', 'total', 'wins']) {
    if (values[key] != null && Number.isFinite(Number(values[key]))) {
      return String(Number(values[key]));
    }
  }
  return '—';
}

/** What a leaderboard's score column means for this bounty: 'Win rate' when
 *  the judge scored it, 'Elo' for a rated contest, otherwise 'Score'. */
export function scoreLabel(values) {
  if (!values || typeof values !== 'object') return 'Score';
  if (values.judge != null) return 'Win rate';
  if (values.elo != null) return 'Elo';
  return 'Score';
}
