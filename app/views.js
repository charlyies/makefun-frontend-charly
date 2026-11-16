// The four surfaces, each a function from API data to HTML. Every surface is
// reachable by a link and by its own hash route (see main.js).

import { compact, date, entries, esc, money, ordinal, score, scoreLabel, stillOpen, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus entry fees paid into it. */
export function pot(bounty) {
  return money(bounty.potUsd ?? bounty.rewardAmount);
}

/** An avatar or share image the API points at. Its host sends
 *  Cross-Origin-Resource-Policy: same-origin, so the img carries
 *  crossorigin="anonymous" before its src. */
export function avatar(url, alt) {
  if (!url) return '<span class="noavatar" aria-hidden="true">?</span>';
  const src = url.startsWith('http') ? url : `https://make.fun${url}`;
  return `<img class="avatar" crossorigin="anonymous" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;
}

/** Open / Closed badge. Decided by the deadline, not the status string. */
export function statusBadge(bounty) {
  return stillOpen(bounty)
    ? '<span class="badge open">Open</span>'
    : '<span class="badge closed">Closed</span>';
}

/** The skills a bounty asks for, as small chips (the API's `skills` array). */
export function skillsChips(bounty) {
  const skills = bounty.skills || [];
  if (!skills.length) return '';
  return `<span class="skills" aria-label="Skills">${skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</span>`;
}

/** One board row: title, pot, fee, time left, entries. */
function boardRow(b) {
  return `
      <li class="row">
        <div class="row-main">
          <a class="row-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
          <span class="row-meta">${esc(b.category || '')}${b.sponsor?.name ? ` · by ${esc(b.sponsor.name)}` : ''}</span>
          ${skillsChips(b)}
        </div>
        <span class="row-pot" title="Live pot: prize plus entry fees paid in">${pot(b)}</span>
        <span class="row-fee">${b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'Free entry'}</span>
        <span class="row-time" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>
        <span class="row-entries">${entries(b.submissionCount)}</span>
        ${statusBadge(b)}
      </li>`;
}

/** The bounty board: live bounties, filterable and sortable in the page. */
export function board(data) {
  const items = (data.items || []).slice();
  return `
    <h1>Open bounties</h1>
    <p class="lede">Live bounties on make.fun — reward is the live pot (prize plus entry fees
    paid in) where the API publishes one. A bounty past its deadline is closed
    even while its status still reads open. Press <kbd>/</kbd> to jump to the
    filter.</p>
    <div class="toolbar">
      <label>Search <input id="filter" type="search" placeholder="Filter by title or category…" autocomplete="off"></label>
      <label>Sort
        <select id="sort">
          <option value="pot">Biggest pot</option>
          <option value="deadline">Closing soonest</option>
          <option value="entries">Most entries</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
      <label><input id="open-only" type="checkbox" checked> Still open only</label>
    </div>
    <p id="board-count" class="count">${items.length} bounties</p>
    <ul class="board" id="board-list">${boardRows(items)}</ul>`;
}

/** Board rows for an already-fetched list, so filtering and sorting in the
 *  page reuse the same markup as the first render. */
export function boardRows(items) {
  return items.map(boardRow).join('');
}

/** The rewards table: live amounts per place, fee shares included when the API gives them. */
function rewardsTable(bounty) {
  const now = bounty.rewardsNow;
  if (Array.isArray(now) && now.length) {
    const rows = now
      .map(
        (r) => `<tr><td>${ordinal(r.place)}</td><td>${money(r.amountUsd)}</td>
          <td class="dim">${money(r.baseUsd)} prize + ${money(r.feeShareUsd)} fees</td></tr>`,
      )
      .join('');
    return `<table class="rewards"><thead><tr><th>Place</th><th>Reward now</th><th>Split</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  const map = bounty.rewards || {};
  const places = Object.keys(map).sort((a, b) => Number(a) - Number(b));
  if (!places.length) return '<p>No rewards table published yet.</p>';
  const rows = places
    .map((p) => `<tr><td>${ordinal(p)}</td><td>${money(map[p])}</td><td class="dim">prize</td></tr>`)
    .join('');
  return `<table class="rewards"><thead><tr><th>Place</th><th>Reward</th><th>Split</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** A bounty's page: summary, facts, rewards, description, rules, entries. */
export function bounty(b) {
  return `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary || '')}</p>
    ${skillsChips(b)}
    <dl class="facts">
      <dt>Reward (live pot)</dt><dd>${pot(b)}</dd>
      ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}${b.entryFeePayers ? ` · ${compact(b.entryFeePayers)} paid` : ''}</dd>` : '<dt>Entry fee</dt><dd>Free</dd>'}
      <dt>Deadline</dt><dd><span data-deadline="${esc(b.deadline)}">${date(b.deadline)} (${timeLeft(b.deadline)})</span></dd>
      <dt>Entries</dt><dd>${entries(b.submissionCount)}</dd>
      <dt>Status</dt><dd>${statusBadge(b)}</dd>
      ${b.sponsor?.name ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name)}${b.sponsor.isVerified ? ' ✓' : ''}</dd>` : ''}
      ${b.category ? `<dt>Category</dt><dd>${esc(b.category)}</dd>` : ''}
    </dl>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="prose">${md(b.description || '')}</div>
    ${b.rules ? `<h2>Rules</h2><div class="prose">${md(b.rules)}</div>` : ''}
    <h2>Latest entries</h2>
    <div id="entries"><p>Loading entries…</p></div>
    <p><button id="more-entries" type="button">Show more entries</button></p>`;
}

/** One entry in a bounty's entries list. */
export function entryRow(s) {
  const when = s.createdAt ? date(s.createdAt) : '';
  return `<li class="row">
      <div class="row-main">
        <span class="row-title">${esc(s.title || 'Untitled entry')}</span>
        <span class="row-meta">by <a href="#/profile/${encodeURIComponent(s.hunter || s.handle || '')}">${esc(s.hunter || s.handle || '')}</a>${when ? ` · ${esc(when)}` : ''}</span>
      </div>
      <span class="row-entries">${esc(s.status || '')}</span>
      <span class="row-pot">${s.score != null ? `score ${Number(s.score).toLocaleString('en-US')}` : ''}</span>
    </li>`;
}

/** A bounty's leaderboard: ranked entries with their score. The score column
 *  adapts to what the bounty scores — the judge's win rate for judged
 *  bounties, Elo for rated ones, a plain number otherwise. The top three
 *  rows carry a rank class so the stylesheet can mark them. */
export function leaderboard(data) {
  const c = data.competition || {};
  const list = data.entries || [];
  const label = scoreLabel(list[0]?.values);
  const rows = list
    .map(
      (e) => `<tr${Number(e.rank) <= 3 ? ` class="rank-${Number(e.rank)}"` : ''}>
        <td>${ordinal(e.rank)}</td>
        <td><span class="who">${avatar(e.image, e.handle)}<a href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></span></td>
        <td>${esc(e.title || '')}</td>
        <td>${score(e.values)}</td>
        <td>${e.values?.valid == null ? '—' : Number(e.values.valid) ? '✓' : '✗'}</td>
      </tr>`,
    )
    .join('');
  return `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(c.slug || '')}">Bounty</a></p>
    <h1>Leaderboard — ${esc(c.title || '')}</h1>
    <p class="lede">${list.length} ranked entries. ${label === 'Win rate'
      ? 'Win rate is the judge’s share of pairwise wins;'
      : ''} The table is live from the public API.</p>
    ${rows
      ? `<table class="standings"><thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>${label}</th><th>Valid</th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p>No ranked entries yet — the leaderboard fills in as entries are judged.</p>'}`;
}

/** An account's public profile. */
export function profile(p) {
  const rec = p.record || {};
  const solutions = p.solutions || [];
  return `
    <h1>${avatar(p.avatar || p.image, p.handle)} ${esc(p.display_name || p.handle)}</h1>
    <p class="lede">${p.bio ? esc(p.bio) : 'No bio yet.'}</p>
    <dl class="facts">
      <dt>Handle</dt><dd>@${esc(p.handle)}</dd>
      ${p.github_login ? `<dt>GitHub</dt><dd>${esc(p.github_login)}</dd>` : ''}
      ${p.x ? `<dt>X</dt><dd>${esc(p.x)}</dd>` : ''}
      ${p.joined_at ? `<dt>Joined</dt><dd>${date(p.joined_at)}</dd>` : ''}
      <dt>Competitions entered</dt><dd>${compact(rec.competitions_entered || 0)}</dd>
      <dt>Placements</dt><dd>${compact(rec.competitions_placed || 0)}</dd>
      <dt>Wins</dt><dd>${compact(rec.competitions_won || 0)}</dd>
      <dt>Prize money</dt><dd>${money(rec.prize_usd || 0)}</dd>
    </dl>
    <h2>Entries</h2>
    ${solutions.length
      ? `<ul class="board">${solutions
          .map(
            (s) => `<li class="row"><div class="row-main">
              <a class="row-title" href="#/bounty/${encodeURIComponent(s.competition_slug || s.slug || '')}">${esc(s.title || s.competition_slug || '')}</a>
              <span class="row-meta">${esc(s.status || '')}</span></div></li>`,
          )
          .join('')}</ul>`
      : '<p>No public entries yet.</p>'}
    <p><a href="https://make.fun${esc(p.profile_url || `/u/${encodeURIComponent(p.handle)}`)}">View on make.fun →</a></p>`;
}

/** A small markdown renderer for the API's description and rules text:
 *  headings, bold, italic, code (inline and fenced), links, dash and
 *  numbered lists, and blockquotes. Input is escaped first, so no HTML
 *  from the API ever reaches the page unescaped. */
export function md(text) {
  const inline = (s) =>
    s
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = [];
  let list = null; // 'ul' | 'ol' | null
  let fence = null;
  const closeList = () => {
    if (list) { out.push(`</${list}>`); list = null; }
  };
  for (const raw of String(text).split('\n')) {
    const line = esc(raw);
    if (line.trim().startsWith('```')) {
      if (fence) { out.push('</code></pre>'); fence = null; }
      else { closeList(); out.push('<pre><code>'); fence = true; }
      continue;
    }
    if (fence) { out.push(`${line}\n`); continue; }
    const head = line.match(/^(#{1,3})\s+(.*)$/);
    const quote = line.match(/^&gt;\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (head) {
      closeList();
      out.push(`<h${head[1].length + 1}>${inline(head[2])}</h${head[1].length + 1}>`);
    } else if (quote) {
      closeList();
      out.push(`<blockquote><p>${inline(quote[1])}</p></blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (ordered) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(ordered[1])}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (fence) out.push('</code></pre>');
  closeList();
  return out.join('');
}
