/**
 * Standalone SEO Page & Sitemap Generator for Prep-it (Interview Tinder)
 * 
 * Generates static indexable HTML pages for all questions with FAQPage Schema.org
 * structured data, sitemap.xml, and category hub.
 * 
 * Can run offline using seed files or against a PostgreSQL database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'frontend', 'public');
const Q_DIR = path.join(PUBLIC_DIR, 'q');

const BASE_URL = (process.env.SEO_BASE_URL || 'https://solve-it-rho.vercel.app').replace(/\/$/, '');
const BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'prep_interview_bot';
const TG_BOT_URL = `https://t.me/${BOT_USERNAME}`;
const APP_URL = process.env.SEO_APP_URL || BASE_URL;

// Transliteration table for clean Russian-to-Latin slugs
const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => (c in CYR ? CYR[c] : ''))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, n) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const PAGE_CSS = `
:root {
  --brand: #4f46e5;
  --brand-hover: #4338ca;
  --brand-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bg-main: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
  line-height: 1.6;
}
header {
  background: var(--brand-gradient);
  color: #fff;
  padding: 48px 20px 40px;
  text-align: center;
  position: relative;
}
header .nav-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 20px;
  background: rgba(255,255,255,0.15);
  padding: 6px 14px;
  border-radius: 20px;
  backdrop-filter: blur(8px);
}
header .nav-back:hover { background: rgba(255,255,255,0.25); color: #fff; }
header h1 {
  font-size: 26px;
  font-weight: 800;
  max-width: 800px;
  margin: 0 auto 16px;
  line-height: 1.35;
}
.badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.badge {
  background: rgba(255,255,255,0.22);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}
.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  color: var(--brand);
  font-size: 16px;
  font-weight: 700;
  padding: 14px 28px;
  border-radius: 14px;
  text-decoration: none;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -5px rgba(0,0,0,0.25);
}
main {
  max-width: 800px;
  margin: 0 auto;
  padding: 36px 20px 80px;
}
.crumbs {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
}
.crumbs a { color: var(--brand); text-decoration: none; }
.crumbs a:hover { text-decoration: underline; }
.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 28px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
}
.answer-box {
  background: #f1f5f9;
  border-left: 4px solid var(--brand);
  padding: 18px 20px;
  border-radius: 0 12px 12px 0;
  font-size: 16px;
  line-height: 1.65;
  color: #1e293b;
  margin-bottom: 20px;
}
.options-list {
  list-style: none;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option-item {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 15px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 10px;
}
.option-item.correct {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
  font-weight: 600;
}
.cta-banner {
  background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
  border: 1.5px solid #c7d2fe;
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  margin: 36px 0;
}
.cta-banner h2 {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 10px;
  color: #1e1b4b;
}
.cta-banner p {
  color: #4338ca;
  font-size: 15px;
  max-width: 540px;
  margin: 0 auto 20px;
}
.cta-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #4f46e5;
  color: #fff;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.15s ease;
}
.btn-primary:hover { background: #4338ca; }
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  color: #4f46e5;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  border: 1.5px solid #c7d2fe;
  transition: background 0.15s ease;
}
.btn-secondary:hover { background: #f8fafc; }
.related-section h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}
.related-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.related-link {
  display: block;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 16px 20px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-main);
  font-weight: 600;
  font-size: 15px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.related-link:hover {
  border-color: var(--brand);
  box-shadow: 0 4px 12px rgba(99,102,241,0.1);
  color: var(--brand);
}
footer {
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  background: #ffffff;
}
footer a { color: var(--brand); text-decoration: none; }
footer a:hover { text-decoration: underline; }
@media (max-width: 600px) {
  header h1 { font-size: 20px; }
  .card { padding: 20px; }
  .cta-actions { flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
}
`;

function questionUrl(q) {
  const lang = slugify(q.language || 'java') || 'java';
  const slug = slugify(q.question);
  const file = slug ? `${q.id}-${slug}.html` : `${q.id}.html`;
  return { rel: `/q/${lang}/${file}`, lang, file };
}

function renderQuestionPage(q, related) {
  const { rel } = questionUrl(q);
  const canonical = `${BASE_URL}${rel}`;
  const lang = q.language || 'Java';
  const title = `${truncate(q.question, 65)} — Вопрос на собеседовании ${lang}`;
  const desc = truncate(q.short_answer || q.question, 155);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.short_answer || '',
        },
      },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'База вопросов', item: `${BASE_URL}/q/` },
      { '@type': 'ListItem', position: 2, name: `${lang}`, item: `${BASE_URL}/q/#${slugify(lang)}` },
      { '@type': 'ListItem', position: 3, name: q.question, item: canonical },
    ],
  };

  const relatedHtml = related
    .map((r) => `<a class="related-link" href="${esc(questionUrl(r).rel)}">→ ${esc(truncate(r.question, 90))}</a>`)
    .join('\n        ');

  const optionsHtml = (q.options && q.options.length > 0)
    ? `
      <div style="margin-top:24px;">
        <p style="font-size:14px;font-weight:700;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Варианты ответа в приложении:</p>
        <ul class="options-list">
          ${q.options.map((opt, i) => `
            <li class="option-item ${i === 0 ? 'correct' : ''}">
              <span style="font-weight:700;min-width:20px;">${String.fromCharCode(65 + i)}.</span>
              <span>${esc(opt)}</span>
              ${i === 0 ? '<span style="margin-left:auto;font-size:12px;background:#10b981;color:#fff;padding:2px 8px;border-radius:6px;">Правильный</span>' : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | Prep-it</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="keywords" content="${esc(lang.toLowerCase())} вопросы собеседование, ${esc((q.category || '').toLowerCase())}, подготовка к интервью программист, ${esc(lang.toLowerCase())} junior middle senior" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${BASE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="canonical" href="${esc(canonical)}" />
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header>
    <a href="/q/" class="nav-back">← Все вопросы по ${esc(lang)}</a>
    <div class="badges">
      <span class="badge">🔥 ${esc(lang)}</span>
      ${q.category ? `<span class="badge">📂 ${esc(q.category)}</span>` : ''}
      ${q.difficulty ? `<span class="badge">⚡ ${esc(q.difficulty)}</span>` : ''}
    </div>
    <h1>${esc(q.question)}</h1>
    <a class="hero-cta" href="${esc(TG_BOT_URL)}" target="_blank" rel="noopener">
      Тренировать в Telegram-боте →
    </a>
  </header>

  <main>
    <nav class="crumbs">
      <a href="/q/">База вопросов</a> › <a href="/q/#${slugify(lang)}">${esc(lang)}</a> ${q.category ? `› ${esc(q.category)}` : ''}
    </nav>

    <div class="card">
      <div class="card-title">
        <span>💡 Краткий ответ для собеседования</span>
      </div>
      <div class="answer-box">
        ${esc(q.short_answer || 'Откройте приложение для детального разбора с ИИ.')}
      </div>

      ${optionsHtml}
    </div>

    <div class="cta-banner">
      <h2>Хотите уверенно пройти техническое собеседование?</h2>
      <p>В приложении Prep-it вы тренируетесь в режиме свайпов за 10 минут в день с мгновенными объяснениями и адаптивным повторением.</p>
      <div class="cta-actions">
        <a class="btn-primary" href="${esc(TG_BOT_URL)}" target="_blank" rel="noopener">
          🚀 Открыть Telegram-бот (@${esc(BOT_USERNAME)})
        </a>
        <a class="btn-secondary" href="${esc(APP_URL)}" target="_blank" rel="noopener">
          💻 Решать в Web-версии
        </a>
      </div>
    </div>

    ${related.length ? `
    <div class="related-section">
      <h3>Похожие вопросы по теме ${esc(q.category || lang)}</h3>
      <div class="related-grid">
        ${relatedHtml}
      </div>
    </div>
    ` : ''}
  </main>

  <footer>
    <p>© ${new Date().getFullYear()} <a href="/">Prep-it</a> · Тренажёр IT-собеседований в Telegram Mini Apps</p>
    <p style="margin-top:8px;"><a href="${esc(TG_BOT_URL)}">Telegram-бот</a> · <a href="/privacy.html">Политика конфиденциальности</a> · <a href="/q/">Все вопросы</a></p>
  </footer>
</body>
</html>`;
}

function renderHub(byLang) {
  let langSectionsHtml = '';

  for (const [lang, questions] of Object.entries(byLang)) {
    const byCat = {};
    for (const q of questions) {
      const cat = q.category || 'General';
      (byCat[cat] ||= []).push(q);
    }

    const catBlocks = Object.entries(byCat)
      .map(([cat, qs]) => {
        const items = qs
          .map((q) => `<li style="margin-bottom:8px;"><a style="color:var(--brand);text-decoration:none;font-weight:500;" href="${esc(questionUrl(q).rel)}">${esc(truncate(q.question, 95))}</a></li>`)
          .join('\n');
        return `
          <div style="background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
            <h4 style="font-size:17px;font-weight:700;margin-bottom:12px;color:#1e293b;">${esc(cat)} <span style="font-size:12px;color:var(--text-muted);font-weight:normal;">(${qs.length})</span></h4>
            <ul style="padding-left:18px;margin:0;">
              ${items}
            </ul>
          </div>
        `;
      })
      .join('\n');

    langSectionsHtml += `
      <section id="${slugify(lang)}" style="margin-top:40px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:10px;">
          <h2 style="font-size:24px;font-weight:800;color:#0f172a;">${esc(lang)} <span style="font-size:16px;font-weight:600;color:var(--brand);">${questions.length} вопросов</span></h2>
          <a href="${esc(TG_BOT_URL)}" target="_blank" style="font-size:14px;color:var(--brand);font-weight:600;text-decoration:none;">Тренировать в боте →</a>
        </div>
        ${catBlocks}
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>База вопросов с реальных IT-собеседований | Prep-it</title>
  <meta name="description" content="Бесплатная база из 800+ вопросов с реальных технических собеседований по Java, Python, Spring, Multithreading, Алгоритмам с готовыми краткими ответами." />
  <meta property="og:title" content="База вопросов с IT-собеседований — Prep-it" />
  <meta property="og:description" content="Реальные вопросы с IT-собеседований с понятными ответами. Бесплатно." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}/q/" />
  <meta property="og:image" content="${BASE_URL}/og-image.png" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="canonical" href="${BASE_URL}/q/" />
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header>
    <h1>База вопросов с реальных IT-собеседований</h1>
    <p style="max-width:600px;margin:0 auto 20px;opacity:0.95;">
      Вопросы и разборы для Junior, Middle и Senior разработчиков. Готовьтесь в удобном формате карточек.
    </p>
    <a class="hero-cta" href="${esc(TG_BOT_URL)}" target="_blank" rel="noopener">
      🚀 Начать тренировку в Telegram-боте
    </a>
  </header>

  <main>
    <div style="background:#fff;border:1px solid var(--border-color);border-radius:14px;padding:20px;margin-bottom:30px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:20px;">🔍</span>
      <input type="text" id="filterInput" placeholder="Поиск по вопросам или темам..." style="width:100%;border:none;font-size:16px;outline:none;" />
    </div>

    ${langSectionsHtml}

    <div class="cta-banner" style="margin-top:50px;">
      <h2>Готовы проверить свои знания на практике?</h2>
      <p>Запустите бота Prep-it в Telegram и проверьте себя прямо сейчас за 5 минут.</p>
      <div class="cta-actions">
        <a class="btn-primary" href="${esc(TG_BOT_URL)}" target="_blank" rel="noopener">
          Запустить бота @${esc(BOT_USERNAME)}
        </a>
      </div>
    </div>
  </main>

  <footer>
    <p>© ${new Date().getFullYear()} <a href="/">Prep-it</a> · Все права защищены</p>
  </footer>

  <script>
    const input = document.getElementById('filterInput');
    input.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const listItems = document.querySelectorAll('main li');
      listItems.forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(term) ? '' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

function renderSitemap(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${u.lastmod || new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ─── Question Loader ──────────────────────────────────────────────────
async function loadQuestions() {
  const allQuestions = [];
  let idCounter = 1;

  // 1. Try to load from database if DATABASE_URL is provided
  if (process.env.DATABASE_URL) {
    try {
      const { default: pg } = await import('pg');
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const { rows } = await pool.query(
        `SELECT id, question, short_answer, category, language, difficulty, options
         FROM questions
         WHERE question IS NOT NULL AND short_answer IS NOT NULL
         ORDER BY language, category, id`
      );
      await pool.end();
      if (rows.length > 0) {
        console.log(`📦 Loaded ${rows.length} questions from database.`);
        return rows;
      }
    } catch (err) {
      console.warn(`⚠️ Could not load from DB (${err.message}), falling back to seed files.`);
    }
  }

  // 2. Load from seed files & curated batches
  const seenTexts = new Set();
  function addUniqueQuestion(q, defaultLang = 'Java') {
    const text = (q.question || q.question_text || '').trim();
    if (!text || text.length < 5) return;
    const lower = text.toLowerCase();
    if (seenTexts.has(lower)) return;
    seenTexts.add(lower);
    allQuestions.push({
      id: idCounter++,
      question: text,
      short_answer: q.short_answer || '',
      category: q.category || 'General Core',
      language: q.language || defaultLang,
      difficulty: q.difficulty || 'Junior/Middle',
      options: Array.isArray(q.options) ? q.options : [],
    });
  }

  // 2.1 Java 2
  try {
    const { newQuestions } = await import('../backend/src/scripts/seed-db-java-2.js');
    if (Array.isArray(newQuestions)) {
      for (const q of newQuestions) addUniqueQuestion(q, 'Java');
    }
  } catch (err) {
    console.warn('⚠️ Error reading seed-db-java-2.js:', err.message);
  }

  // 2.2 Python
  try {
    const { pythonQuestions } = await import('../backend/src/scripts/seed-db-python.js');
    if (Array.isArray(pythonQuestions)) {
      for (const q of pythonQuestions) addUniqueQuestion(q, 'Python');
    }
  } catch (err) {
    console.warn('⚠️ Error reading seed-db-python.js:', err.message);
  }

  // 2.3 Hand-curated RU batches (Go, Rust, TypeScript, Kotlin, React)
  const ruBatchFiles = [
    'seed-ru-ts1.mjs', 'seed-ru-ts2.mjs', 'seed-ru-ts3.mjs', 'seed-ru-ts4.mjs',
    'seed-ru-go1.mjs', 'seed-ru-go2.mjs', 'seed-ru-go3.mjs', 'seed-ru-go4.mjs', 'seed-ru-go5.mjs', 'seed-ru-go6.mjs',
    'seed-ru-rust1.mjs', 'seed-ru-rust2.mjs', 'seed-ru-rust3.mjs', 'seed-ru-rust4.mjs',
    'seed-ru-react1.mjs', 'seed-ru-react2.mjs', 'seed-ru-react3.mjs',
    'seed-ru-kotlin1.mjs', 'seed-ru-kotlin2.mjs', 'seed-ru-kotlin3.mjs'
  ];

  for (const batchFile of ruBatchFiles) {
    try {
      const mod = await import('../backend/src/scripts/' + batchFile);
      const list = mod.questions || mod.default || [];
      if (Array.isArray(list)) {
        for (const q of list) addUniqueQuestion(q);
      }
    } catch (err) {
      console.warn('⚠️ Error loading ' + batchFile + ':', err.message);
    }
  }

  // 2.4 Active/top questions from data/questions-data.json
  try {
    const dataJsonPath = path.resolve(ROOT_DIR, 'data', 'questions-data.json');
    if (fs.existsSync(dataJsonPath)) {
      const raw = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
      if (Array.isArray(raw)) {
        for (const q of raw) {
          if ((q.is_top || q.is_active) && q.short_answer && q.short_answer.trim().length >= 15) {
            addUniqueQuestion(q, q.language || 'Java');
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Error loading data/questions-data.json:', err.message);
  }

  console.log('📦 Loaded and deduplicated ' + allQuestions.length + ' total questions across languages.');
  return allQuestions;
}

// ─── Main Execution ───────────────────────────────────────────────────
export async function generateSeoPages() {
  console.log('🚀 Starting SEO Pages & Sitemap Generation...');
  const questions = await loadQuestions();

  if (questions.length === 0) {
    console.warn('❌ No questions found to generate SEO pages.');
    return;
  }

  console.log(`📝 Processing ${questions.length} questions...`);

  const byLang = {};
  for (const q of questions) {
    const lang = q.language || 'Java';
    (byLang[lang] ||= []).push(q);
  }

  fs.mkdirSync(Q_DIR, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const sitemapUrls = [
    { loc: `${BASE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/landing.html`, lastmod: today, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/landing.ru.html`, lastmod: today, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/q/`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE_URL}/java-interview-questions.html`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/privacy.html`, lastmod: today, changefreq: 'monthly', priority: '0.3' },
  ];

  let generatedPages = 0;

  for (const [, langQuestions] of Object.entries(byLang)) {
    for (const q of langQuestions) {
      const { rel, lang } = questionUrl(q);
      const targetDir = path.join(Q_DIR, lang);
      fs.mkdirSync(targetDir, { recursive: true });

      const related = langQuestions
        .filter((r) => r.id !== q.id && r.category === q.category)
        .slice(0, 6);

      const html = renderQuestionPage(q, related);
      const filePath = path.join(PUBLIC_DIR, rel.replace(/^\//, ''));
      fs.writeFileSync(filePath, html, 'utf8');

      sitemapUrls.push({
        loc: `${BASE_URL}${rel}`,
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.7',
      });

      generatedPages++;
    }
  }

  // Write Hub Page
  fs.writeFileSync(path.join(Q_DIR, 'index.html'), renderHub(byLang), 'utf8');

  // Write Sitemap XML
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemap(sitemapUrls), 'utf8');

  // Update robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf8');

  // Write GEO files (llms.txt) for AI search engines (Perplexity, ChatGPT Search, Claude)
  const llmsTxt = `# Prep-it: IT Interview Preparation Engine
> Interactive, swipe-based technical interview preparation with 2,000+ curated questions across Java, Python, Go, TypeScript, Rust, Kotlin, and React.

## Question Tracks & Hubs
- Java: ${BASE_URL}/q/java/
- Python: ${BASE_URL}/q/python/
- Go: ${BASE_URL}/q/go/
- TypeScript: ${BASE_URL}/q/typescript/
- Rust: ${BASE_URL}/q/rust/
- Kotlin: ${BASE_URL}/q/kotlin/
- React: ${BASE_URL}/q/react/
- All Questions Hub: ${BASE_URL}/q/

## Official Web & Telegram Channels
- WebApp: ${BASE_URL}
- Telegram Bot: ${TG_BOT_URL}
- Daily Channel: https://t.me/prep_interview_daily
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');
  console.log(`   - Generated ${path.join(PUBLIC_DIR, 'llms.txt')} (GEO AI Engine Optimization)`);


  console.log(`✅ SEO Generation Complete!`);
  console.log(`   - Generated ${generatedPages} question pages in ${Q_DIR}`);
  console.log(`   - Generated ${path.join(Q_DIR, 'index.html')} (Category Hub)`);
  console.log(`   - Generated ${path.join(PUBLIC_DIR, 'sitemap.xml')} (${sitemapUrls.length} indexed URLs)`);
  console.log(`   - Updated ${path.join(PUBLIC_DIR, 'robots.txt')} -> Sitemap: ${BASE_URL}/sitemap.xml`);
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSeoPages().catch((err) => {
    console.error('Fatal SEO generation error:', err);
    process.exit(1);
  });
}
