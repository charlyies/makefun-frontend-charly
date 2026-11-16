// The router. Four hash routes, each a linkable URL of its own:
//
//   #/                            the bounty board
//   #/bounty/<slug>               one bounty
//   #/bounty/<slug>/leaderboard   that bounty's leaderboard
//   #/profile/<handle>            an account's public profile
//
// window.__shotReady is false while a route loads and true once its data is
// on screen, so a screenshot script knows when to capture. Time-left labels
// tick once a minute by updating only their own text, never the whole page.
// Hovering (or keyboard-focusing) a board row prefetches that bounty's page
// in the background, so the click that follows usually renders from cache.
// '/' focuses the board filter; Escape clears it.

import { getBounties, getBounty, getLeaderboard, getProfile, getSubmissions, prefetchBounty, stats } from './api.js';
import { board, boardRows, bounty, entryRow, leaderboard, profile } from './views.js';
import { stillOpen, timeLeft } from './format.js';

const app = document.getElementById('app');
const footerStats = document.getElementById('stats');
let boardData = null;
let entryLimit = 20;
let currentSlug = null;

function statsLine() {
  const failed = stats.errors ? ` · ${stats.errors} failed` : '';
  return `${stats.sent} requests · ${stats.revalidated} revalidated (304)${failed}`;
}

function show(html) {
  app.innerHTML = html;
  footerStats.textContent = statsLine();
  window.scrollTo(0, 0);
}

function fail(err) {
  document.title = 'Something went wrong · make.fun board';
  show(`<h1>Something went wrong</h1><p>make.fun's API did not answer. Check the
    connection and try again.</p><p class="dim">${String(err?.message || err)}</p>
    <p><button id="retry" type="button">Try again</button></p>`);
  document.getElementById('retry')?.addEventListener('click', render);
  window.__shotReady = true;
}

/** Refresh every time-left label in place, once a minute. */
function tick() {
  for (const el of document.querySelectorAll('[data-deadline]')) {
    const label = timeLeft(el.dataset.deadline);
    if (el.textContent.includes('(')) {
      el.textContent = el.textContent.replace(/\([^)]*\)\s*$/, `(${label})`);
    } else {
      el.textContent = label;
    }
  }
}
setInterval(tick, 60000);

function sortBoard(items, key) {
  const list = items.slice();
  if (key === 'pot') list.sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  if (key === 'deadline') list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (key === 'entries') list.sort((a, b) => Number(b.submissionCount) - Number(a.submissionCount));
  if (key === 'title') list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  return list;
}

/** Re-render the board rows from the already-fetched list: filter and sort
 *  never hit the network again. */
function applyBoardFilter() {
  if (!boardData) return;
  const q = (document.getElementById('filter')?.value || '').toLowerCase();
  const openOnly = document.getElementById('open-only')?.checked;
  const key = document.getElementById('sort')?.value || 'pot';
  const items = sortBoard(boardData.items || [], key).filter((b) => {
    if (openOnly && !stillOpen(b)) return false;
    if (!q) return true;
    return `${b.title} ${b.category || ''} ${b.sponsor?.name || ''} ${(b.skills || []).join(' ')}`.toLowerCase().includes(q);
  });
  const list = document.getElementById('board-list');
  const count = document.getElementById('board-count');
  if (list) list.innerHTML = boardRows(items);
  if (count) count.textContent = `${items.length} bounties`;
}

async function renderBoard() {
  document.title = 'Open bounties · make.fun board';
  try {
    boardData = await getBounties();
    show(board(boardData));
    for (const id of ['filter', 'sort', 'open-only']) {
      document.getElementById(id)?.addEventListener('input', applyBoardFilter);
    }
    applyBoardFilter(); // honour the default "Still open only" on first paint
    window.__shotReady = true;
  } catch (err) {
    fail(err);
  }
}

async function renderBounty(slug) {
  try {
    const b = await getBounty(slug);
    currentSlug = slug;
    entryLimit = 20;
    document.title = `${b.title} · make.fun board`;
    show(bounty(b));
    document.getElementById('more-entries')?.addEventListener('click', loadMoreEntries);
    await loadEntries();
    window.__shotReady = true;
  } catch (err) {
    fail(err);
  }
}

async function loadEntries() {
  if (!currentSlug) return;
  const box = document.getElementById('entries');
  if (!box) return;
  try {
    const data = await getSubmissions(currentSlug, entryLimit);
    const items = data.items || [];
    box.innerHTML = items.length
      ? `<ul class="board">${items.map(entryRow).join('')}</ul>`
      : '<p>No entries yet.</p>';
    footerStats.textContent = statsLine();
  } catch {
    box.innerHTML = '<p>Entries could not be loaded.</p>';
  }
}

async function loadMoreEntries() {
  entryLimit += 30;
  await loadEntries();
}

async function renderLeaderboard(slug) {
  try {
    const data = await getLeaderboard(slug);
    document.title = `Leaderboard · ${(data.competition?.title || slug)} · make.fun board`;
    show(leaderboard(data));
    window.__shotReady = true;
  } catch (err) {
    fail(err);
  }
}

async function renderProfile(handle) {
  if (!handle) return renderBoard();
  try {
    const p = await getProfile(handle);
    document.title = `@${p.handle} · make.fun board`;
    show(profile(p));
    window.__shotReady = true;
  } catch (err) {
    fail(err);
  }
}

async function render() {
  window.__shotReady = false;
  app.innerHTML = '<p>Loading…</p>';
  const hash = location.hash || '#/';
  let m = hash.match(/^#\/bounty\/([^/]+)\/leaderboard\/?$/);
  if (m) return renderLeaderboard(decodeURIComponent(m[1]));
  m = hash.match(/^#\/bounty\/([^/]+)\/?$/);
  if (m) return renderBounty(decodeURIComponent(m[1]));
  m = hash.match(/^#\/profile\/([^/]+)\/?$/);
  if (m) return renderProfile(decodeURIComponent(m[1]));
  if (/^#\/profile\/?$/.test(hash)) return renderBoard();
  return renderBoard();
}

document.getElementById('handle-go')?.addEventListener('click', () => {
  const handle = document.getElementById('handle-search')?.value.trim();
  if (handle) location.hash = `#/profile/${encodeURIComponent(handle)}`;
});
document.getElementById('handle-search')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const handle = e.target.value.trim();
    if (handle) location.hash = `#/profile/${encodeURIComponent(handle)}`;
  }
});

/** '/' focuses the board filter (when the reader is not already typing);
 *  Escape clears it. Hovering or focusing a board row prefetches its bounty. */
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
    const filter = document.getElementById('filter');
    if (filter) { e.preventDefault(); filter.focus(); }
  }
  if (e.key === 'Escape' && document.activeElement?.id === 'filter') {
    document.activeElement.value = '';
    applyBoardFilter();
    document.activeElement.blur();
  }
});
app.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a.row-title');
  if (link) {
    const m = link.getAttribute('href')?.match(/^#\/bounty\/([^/]+)$/);
    if (m) prefetchBounty(decodeURIComponent(m[1]));
  }
});
app.addEventListener('focusin', (e) => {
  const link = e.target.closest('a.row-title');
  if (link) {
    const m = link.getAttribute('href')?.match(/^#\/bounty\/([^/]+)$/);
    if (m) prefetchBounty(decodeURIComponent(m[1]));
  }
});

window.addEventListener('hashchange', render);
render();
