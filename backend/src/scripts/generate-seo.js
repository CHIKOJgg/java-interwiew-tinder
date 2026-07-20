import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

/**
 * SEO page generator.
 *
 * The question base is the cheapest content the product owns. This turns every
 * question into an indexable long-tail landing page ("In Java, what is the
 * difference between == and equals()?") — each one ranks for exactly the query
 * a candidate types the night before an interview, and funnels into the app.
 *
 * Outputs (all static, served as-is by Vercel/Netlify before the SPA fallback):
 *   frontend/public/q/index.html                 — hub, links every question
 *   frontend/public/q/<lang>/<id>-<slug>.html     — one page per question (FAQ schema)
 *   frontend/public/sitemap.xml                   — regenerated with every URL
 *
 * Idempotent: safe to re-run. Configure the canonical host with SEO_BASE_URL.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../../frontend/public');
const Q_DIR = path.join(PUBLIC_DIR, 'q');
const BASE_URL = (process.env.SEO_BASE_URL || 'https://java-interview-tinder.fly.dev').replace(/\/$/, '');
const APP_URL = process.env.SEO_APP_URL || `${BASE_URL}/`;

// ─── Helpers ──────────────────────────────────────────────────────────
const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text) {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => (c in CYR ? CYR[c] : ''))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return s;
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
:root { --brand:#5c7cfa; --brand2:#8b5cf6; }
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#212529;line-height:1.6;}
header{background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;padding:44px 20px;text-align:center;}
header h1{margin:0 0 12px;font-size:26px;max-width:760px;margin-inline:auto;}
header p{margin:0 auto;max-width:560px;font-size:16px;opacity:.92;}
a.cta{display:inline-block;margin-top:20px;background:#fff;color:var(--brand);font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;}
main{max-width:760px;margin:0 auto;padding:36px 20px 64px;}
.answer{background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:18px 20px;margin:18px 0;font-size:17px;}
.meta{font-size:13px;opacity:.6;margin:0 0 8px;}
.related{margin-top:40px;}
.related h2{font-size:19px;}
.related ul{padding-left:18px;}
.related a{color:var(--brand);}
.cta-block{text-align:center;margin:40px 0 0;}
footer{text-align:center;padding:32px 20px;font-size:13px;opacity:.6;}
a{color:var(--brand);}
nav.crumbs{font-size:13px;opacity:.7;margin-bottom:14px;}
nav.crumbs a{color:var(--brand);}
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
  const title = `${truncate(q.question, 60)} — ${lang} interview question`;
  const desc = truncate(q.short_answer || q.question, 155);
  const relatedList = related
    .map((r) => `<li><a href="${esc(questionUrl(r).rel)}">${esc(truncate(r.question, 90))}</a></li>`)
    .join('\n        ');

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.short_answer || '' },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="keywords" content="${esc(lang.toLowerCase())} interview questions, ${esc((q.category || '').toLowerCase())}, ${esc(lang.toLowerCase())} interview prep" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="canonical" href="${esc(canonical)}" />
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header>
    <h1>${esc(q.question)}</h1>
    <p>${esc(lang)} interview question${q.category ? ` · ${esc(q.category)}` : ''}${q.difficulty ? ` · ${esc(q.difficulty)}` : ''}</p>
    <a class="cta" href="${esc(APP_URL)}">Practice this in the app →</a>
  </header>
  <main>
    <nav class="crumbs"><a href="/q/">All questions</a> › ${esc(lang)}${q.category ? ` › ${esc(q.category)}` : ''}</nav>
    <p class="meta">Short answer</p>
    <div class="answer">${esc(q.short_answer || 'Open the app for a full AI-generated explanation.')}</div>
    <div class="cta-block">
      <a class="cta" href="${esc(APP_URL)}">Get the full AI breakdown — free →</a>
    </div>
    ${related.length ? `<section class="related">
      <h2>Related ${esc(lang)} interview questions</h2>
      <ul>
        ${relatedList}
      </ul>
    </section>` : ''}
  </main>
  <footer>© ${new Date().getFullYear()} Interview Tinder · <a href="/">Practice 10 min/day, free</a></footer>
</body>
</html>
`;
}

function renderHub(byLang) {
  const sections = Object.entries(byLang)
    .map(([lang, questions]) => {
      const byCat = {};
      for (const q of questions) {
        const cat = q.category || 'General';
        (byCat[cat] ||= []).push(q);
      }
      const cats = Object.entries(byCat)
        .map(([cat, qs]) => {
          const items = qs
            .map((q) => `<li><a href="${esc(questionUrl(q).rel)}">${esc(truncate(q.question, 100))}</a></li>`)
            .join('\n          ');
          return `<h3>${esc(cat)}</h3>\n        <ul>\n          ${items}\n        </ul>`;
        })
        .join('\n      ');
      return `<section>\n      <h2>${esc(lang)} interview questions</h2>\n      ${cats}\n    </section>`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interview Questions Library — Java, Python, TypeScript | Interview Tinder</title>
  <meta name="description" content="A free, searchable library of real Java, Python and TypeScript interview questions with instant AI explanations. Practice 10 minutes a day." />
  <meta property="og:title" content="Interview Questions Library — Interview Tinder" />
  <meta property="og:description" content="Real interview questions with instant AI explanations. Free." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og-image.png" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="canonical" href="${esc(BASE_URL)}/q/" />
  <style>${PAGE_CSS}
    ul{columns:1;}
    h2{font-size:24px;margin-top:44px;border-top:1px solid #e9ecef;padding-top:24px;}
    h3{font-size:17px;margin-top:26px;color:var(--brand);}
  </style>
</head>
<body>
  <header>
    <h1>Interview Questions Library</h1>
    <p>Every real interview question in Interview Tinder, with instant AI explanations. Java, Python & TypeScript.</p>
    <a class="cta" href="${esc(APP_URL)}">Start practicing free →</a>
  </header>
  <main>
    ${sections}
    <div class="cta-block"><a class="cta" href="${esc(APP_URL)}">Practice these 10 min/day — free →</a></div>
  </main>
  <footer>© ${new Date().getFullYear()} Interview Tinder</footer>
</body>
</html>
`;
}

function renderSitemap(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🔎 Generating SEO pages...');
  const { rows: questions } = await pool.query(
    `SELECT id, question, short_answer, category, language, difficulty, topic
     FROM questions
     WHERE question IS NOT NULL AND short_answer IS NOT NULL
     ORDER BY language, category, id`
  );

  if (questions.length === 0) {
    console.warn('⚠️  No questions found. Seed the DB first (npm run setup-db).');
    return;
  }

  const byLang = {};
  for (const q of questions) {
    (byLang[q.language || 'Java'] ||= []).push(q);
  }

  fs.mkdirSync(Q_DIR, { recursive: true });

  const sitemapUrls = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/q/`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/java-interview-questions.html`, changefreq: 'weekly', priority: '0.8' },
  ];

  let count = 0;
  for (const [, langQuestions] of Object.entries(byLang)) {
    for (const q of langQuestions) {
      const { rel, lang } = questionUrl(q);
      const dir = path.join(Q_DIR, lang);
      fs.mkdirSync(dir, { recursive: true });

      const related = langQuestions
        .filter((r) => r.id !== q.id && r.category === q.category)
        .slice(0, 6);

      fs.writeFileSync(path.join(PUBLIC_DIR, rel.replace(/^\//, '')), renderQuestionPage(q, related), 'utf8');
      sitemapUrls.push({ loc: `${BASE_URL}${rel}`, changefreq: 'monthly', priority: '0.6' });
      count++;
    }
  }

  fs.writeFileSync(path.join(Q_DIR, 'index.html'), renderHub(byLang), 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemap(sitemapUrls), 'utf8');

  console.log(`✅ Generated ${count} question pages + hub + sitemap (${sitemapUrls.length} URLs).`);
  console.log(`   Base URL: ${BASE_URL}  (override with SEO_BASE_URL)`);
}

main()
  .catch((err) => {
    console.error('SEO generation failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
