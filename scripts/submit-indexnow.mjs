/**
 * Automated IndexNow Search Engine Submission Script
 * 
 * Submits all URLs from sitemap.xml to IndexNow (Bing, Yandex, Seznam, Naver)
 * for immediate indexing without waiting weeks for organic crawler passes.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const INDEXNOW_KEY = 'c7b419b48f6c433c945145b23d069b18';
const HOST = 'solve-it-rho.vercel.app';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

// 1. Ensure IndexNow key file exists in public/
const keyFilePath = path.resolve(ROOT_DIR, 'frontend', 'public', `${INDEXNOW_KEY}.txt`);
fs.writeFileSync(keyFilePath, INDEXNOW_KEY, 'utf8');
console.log(`🔑 Verification key file created at: ${keyFilePath}`);

// 2. Extract URLs from sitemap.xml
const sitemapPath = path.resolve(ROOT_DIR, 'frontend', 'public', 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error(`❌ sitemap.xml not found at ${sitemapPath}`);
  process.exit(1);
}

const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
const urlList = [];
let match;
while ((match = locRegex.exec(sitemapXml)) !== null) {
  urlList.push(match[1]);
}

console.log(`📋 Found ${urlList.length} unique URLs in sitemap.xml for ${HOST}`);

function submitToIndexNowEndpoint(endpointUrl, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const parsed = new URL(endpointUrl);

    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'PrepIt-IndexNow-Submitter/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        resolve({
          endpoint: endpointUrl,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          response: body,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint: endpointUrl,
        statusCode: 0,
        statusMessage: err.message,
        response: null,
      });
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://yandex.com/indexnow',
    'https://www.bing.com/indexnow',
  ];

  const results = [];
  console.log(`\n🚀 Submitting ${urlList.length} URLs to IndexNow network...`);

  for (const ep of endpoints) {
    console.log(`📡 Sending batch to ${ep}...`);
    const res = await submitToIndexNowEndpoint(ep, payload);
    console.log(`   -> Status: ${res.statusCode} (${res.statusMessage})`);
    results.push(res);
  }

  const resultRecord = {
    submittedAt: new Date().toISOString(),
    host: HOST,
    key: INDEXNOW_KEY,
    urlCount: urlList.length,
    results: results,
    sampleUrls: urlList.slice(0, 5),
  };

  const recordPath = path.resolve(ROOT_DIR, 'marketing', 'INDEXNOW_SUBMISSION.json');
  fs.writeFileSync(recordPath, JSON.stringify(resultRecord, null, 2), 'utf8');
  console.log(`\n✅ IndexNow submission complete. Report saved to ${recordPath}`);
}

main().catch(console.error);
