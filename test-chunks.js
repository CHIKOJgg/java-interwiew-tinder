const http = require('https');

function test(url, label) {
  return new Promise((resolve) => {
    const r = http.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('Status:', res.statusCode);
        console.log('Length:', body.length);
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    r.end();
  });
}

async function checkChunk(file) {
  const bundle = await test('https://solve-it-rho.vercel.app/assets/' + file, 'Chunk: ' + file);
  if (bundle && bundle.body) {
    const urlPattern = /https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s"'<>]*/g;
    const urls = bundle.body.match(urlPattern);
    if (urls) {
      const filtered = urls.filter(u => u.includes('inter') || u.includes('railway') || u.includes('vercel.app') || u.includes('api'));
      if (filtered.length > 0) {
        console.log('URLs found:', filtered);
      }
    }

    if (bundle.body.includes('VITE')) {
      const idx = bundle.body.indexOf('VITE');
      console.log('VITE context:', bundle.body.substring(Math.max(0, idx - 50), idx + 150));
    }
  }
}

async function main() {
  const chunks = ['ai-BztdJaUj.js', 'App-CMfizgDF.js', 'react-vendor-9zLubtET.js', 'guestProgress-DrVl25LE.js', 'ui-Dh0SXnuI.js'];
  for (const chunk of chunks) {
    await checkChunk(chunk);
  }
}

main();