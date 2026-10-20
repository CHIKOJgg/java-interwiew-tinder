/**
 * Publish marketing articles directly to Telegra.ph via official open API.
 * 
 * Telegra.ph articles provide:
 * 1. Instant View inside Telegram
 * 2. High domain authority indexing in Google & Yandex
 * 3. Permanent, clean shareable links with embedded CTAs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to make HTTPS POST requests
function postJSON(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) resolve(json.result);
          else reject(new Error(json.error || body));
        } catch {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Convert simple markdown text to Telegra.ph Node array
function markdownToTelegraphNodes(markdown) {
  const lines = markdown.split('\n');
  const nodes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('### ')) {
      nodes.push({ tag: 'h4', children: [line.replace('### ', '')] });
    } else if (line.startsWith('## ')) {
      nodes.push({ tag: 'h3', children: [line.replace('## ', '')] });
    } else if (line.startsWith('# ')) {
      // H1 is article title, inside body we use h3
      nodes.push({ tag: 'h3', children: [line.replace('# ', '')] });
    } else if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({ tag: 'pre', children: [codeLines.join('\n')] });
    } else if (line.startsWith('> ')) {
      nodes.push({ tag: 'blockquote', children: [line.replace('> ', '')] });
    } else if (line.startsWith('- ')) {
      nodes.push({ tag: 'p', children: ['• ' + line.replace('- ', '')] });
    } else if (line.startsWith('---')) {
      nodes.push({ tag: 'hr' });
    } else {
      // Regular paragraph - handle bold & links
      nodes.push({ tag: 'p', children: [line] });
    }
  }

  // Add strong footer CTA node
  nodes.push({ tag: 'hr' });
  nodes.push({
    tag: 'p',
    children: [
      '🔥 ',
      {
        tag: 'a',
        attrs: { href: 'https://t.me/prep_interview_bot' },
        children: ['Запустить тренажер Prep-it в Telegram (@prep_interview_bot)'],
      },
      ' — тренируйтесь за 10 минут в день!',
    ],
  });

  return nodes;
}

async function main() {
  console.log('📡 Creating anonymous Telegra.ph publisher account...');
  const account = await postJSON('https://api.telegra.ph/createAccount', {
    short_name: 'PrepIt',
    author_name: 'Prep-it: Interview Tinder',
    author_url: 'https://t.me/prep_interview_bot',
  });

  const accessToken = account.access_token;
  console.log('✅ Telegra.ph publisher ready.');

  const articlesToPublish = [
    {
      file: 'marketing/HABR_ARTICLE.md',
      title: 'Как я устал зубрить 500 вопросов к IT-собеседованиям и написал «Tinder для интервью»',
    },
    {
      file: 'marketing/VC_ARTICLE.md',
      title: 'Как запустить микро-SaaS в Telegram Mini Apps без бюджета: тренажер IT-собеседований',
    },
    {
      file: 'marketing/CONTENT_PACK_30_DAYS.md',
      title: 'Шпаргалка: Топ каверзных вопросов с собеседований по Java и Python с разборами',
    },
  ];

  const publishedResults = [];

  for (const art of articlesToPublish) {
    const fullPath = path.resolve(ROOT_DIR, art.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      continue;
    }

    const md = fs.readFileSync(fullPath, 'utf8');
    const nodes = markdownToTelegraphNodes(md);

    console.log(`📝 Publishing "${art.title}" (${nodes.length} blocks)...`);

    try {
      const page = await postJSON('https://api.telegra.ph/createPage', {
        access_token: accessToken,
        title: art.title,
        author_name: 'Prep-it (Интервью)',
        author_url: 'https://t.me/prep_interview_bot',
        content: nodes,
        return_content: false,
      });

      console.log(`🎉 Live on Telegra.ph: ${page.url}`);
      publishedResults.push({
        title: art.title,
        url: page.url,
        file: art.file,
      });
    } catch (err) {
      console.error(`❌ Failed to publish ${art.title}:`, err.message);
    }
  }

  // Save published URLs to marketing/PUBLISHED_LINKS.json and .md
  const jsonPath = path.resolve(ROOT_DIR, 'marketing', 'PUBLISHED_LINKS.json');
  fs.writeFileSync(jsonPath, JSON.stringify(publishedResults, null, 2), 'utf8');

  const mdContent = `# 🚀 Опубликованные статьи и живые ссылки для продвижения

Статьи опубликованы на платформе **Telegra.ph** (поддерживают **Instant View** внутри Telegram и мгновенно индексируются поисковиками Google и Яндекс):

${publishedResults
  .map(
    (p, i) =>
      `### ${i + 1}. [${p.title}](${p.url})\n🔗 **Ссылка:** ${p.url}\n⚡ *Открывается внутри Telegram с Instant View (без задержек)*\n`
  )
  .join('\n')}

---

### Где размещать эти ссылки для бесплатного трафика:
1. **Telegram IT-каналы и чаты** (Java, Python, Собеседования, Junior/Middle вакансии). Ссылки на Telegra.ph не блокируются спам-фильтрами, так как это официальный домен Telegram.
2. **Reddit:** r/java, r/learnprogramming, r/Python, r/cscareerquestions.
3. **LinkedIn & Twitter (X):** Публикация с тегами #Java #Python #InterviewPrep #TelegramMiniApps.
4. **Хабр & VC.ru:** Готовые тексты лежат в \`marketing/HABR_ARTICLE.md\` и \`marketing/VC_ARTICLE.md\`.
`;

  const mdPath = path.resolve(ROOT_DIR, 'marketing', 'PUBLISHED_LINKS.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  console.log(`\n💾 Saved live links report to ${mdPath}`);
}

main().catch((err) => {
  console.error('Fatal publication error:', err);
  process.exit(1);
});
