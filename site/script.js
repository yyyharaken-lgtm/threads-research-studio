/* ============================================
   Threads Research Studio - フロントエンド
   静的データ（data.json）を読み込んで表示するシンプル版
   ============================================ */

// ===== ジャンル定義 =====
// data.json に登場するジャンル名と、表示用のアイコン・並び順を定義
const GENRES = [
  { name: '美容',        icon: '💄' },
  { name: 'お金',        icon: '💰' },
  { name: '育児',        icon: '👶' },
  { name: '恋愛',        icon: '💕' },
  { name: '占い',        icon: '🔮' },
  { name: 'AI',          icon: '🤖' },
  { name: '転職',        icon: '💼' },
  { name: '健康',        icon: '🌿' },
  { name: 'ダイエット',  icon: '💪' },
];

// ===== 状態 =====
const state = {
  data: null,           // data.json の中身
  currentGenre: null,   // 表示中のジャンル
};

// ===== DOM ヘルパー =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ===== ビュー切り替え =====
function showView(viewName) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`[data-view="${viewName}"]`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== トースト =====
function showToast(message, duration = 2500) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== HTMLエスケープ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== クリップボードコピー =====
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('クリップボードにコピーしました'))
    .catch(() => showToast('コピーに失敗しました'));
}

// ===== データ読み込み =====
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`データを読み込めませんでした (${res.status})`);
    state.data = await res.json();
    return state.data;
  } catch (e) {
    console.error('データ読み込み失敗:', e);
    state.data = { updated_at: '—', posts: [] };
    return state.data;
  }
}

// ===== ホーム画面の表示 =====
function renderHome() {
  const data = state.data;
  const posts = data.posts || [];

  // 統計
  $('#totalCount').textContent = posts.length;

  // ジャンル別の件数を計算
  const genreCounts = {};
  posts.forEach(p => {
    genreCounts[p.genre] = (genreCounts[p.genre] || 0) + 1;
  });

  const activeGenreCount = Object.keys(genreCounts).length;
  $('#genreCount').textContent = activeGenreCount;

  // 最終更新日
  $('#updatedAt').textContent = data.updated_at || '—';

  // ジャンルカード
  const grid = $('#genreGrid');
  grid.innerHTML = '';

  GENRES.forEach(genre => {
    const count = genreCounts[genre.name] || 0;
    const card = document.createElement('div');
    card.className = 'genre-card';
    if (count === 0) card.classList.add('empty');
    card.innerHTML = `
      <div class="genre-icon">${genre.icon}</div>
      <div class="genre-name">${genre.name}</div>
      <div class="genre-count">${count}件</div>
    `;
    card.addEventListener('click', () => {
      if (count === 0) {
        showToast(`${genre.name}ジャンルの投稿はまだありません`);
        return;
      }
      openGenre(genre);
    });
    grid.appendChild(card);
  });
}

// ===== ジャンル詳細画面の表示 =====
function openGenre(genre) {
  state.currentGenre = genre;
  const posts = (state.data?.posts || [])
    .filter(p => p.genre === genre.name)
    .sort((a, b) => {
      // 新着順（posted_at の降順）
      const da = a.posted_at || '';
      const db = b.posted_at || '';
      return db.localeCompare(da);
    });

  $('#genreDetailTitle').textContent = `${genre.icon} ${genre.name}`;
  $('#genreDetailMeta').textContent = `${posts.length}件の投稿`;

  renderPostList(posts);
  showView('genre-detail');
}

function renderPostList(posts) {
  const list = $('#postList');
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `
      <div class="post-card" style="text-align:center;color:var(--text-3);">
        該当する投稿がありません
      </div>
    `;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const tags = [];
    if (post.posted_at) tags.push(`<span class="post-tag">${post.posted_at}</span>`);
    if (post.likes !== undefined) tags.push(`<span class="post-tag likes">❤ ${post.likes}</span>`);

    const authorUrl = post.author_url || '#';
    const postUrl = post.post_url || '#';
    const text = escapeHtml(post.post_text || '');

    card.innerHTML = `
      <div class="post-meta">
        <a class="post-author" href="${authorUrl}" target="_blank" rel="noopener">@${post.author_name || '?'}</a>
        <div class="post-tags">${tags.join('')}</div>
      </div>
      <div class="post-text">${text}</div>
      <div class="post-actions">
        <a href="${postUrl}" target="_blank" rel="noopener">🔗 元投稿で読む</a>
        <button class="post-copy">📋 本文をコピー</button>
      </div>
    `;

    card.querySelector('.post-copy').addEventListener('click', () => {
      copyToClipboard(post.post_text || '');
    });

    list.appendChild(card);
  });
}

// ===== イベント設定 =====
function setupEventListeners() {
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'go-home') {
      showView('home');
    }
  });
}

// ===== エラー表示 =====
function showError(message) {
  $('#errorMessage').textContent = message;
  showView('error');
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadData();
  renderHome();
  showView('home');
});
