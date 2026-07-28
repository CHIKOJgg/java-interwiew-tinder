const http = require('https');

function test(url, label, headers) {
  return new Promise((resolve) => {
    const r = http.request(url, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('URL:', url);
        console.log('Status:', res.statusCode);
        const corsHeaders = Object.entries(res.headers).filter(([k]) => k.includes('access') || k.includes('cors') || k.includes('origin'));
        for (const [k, v] of corsHeaders) console.log(k + ':', v);
        console.log('Body:', body.length > 200 ? body.substring(0, 200) + '...' : body);
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    r.end();
  });
}

async function main() {
  await test('https://solve-it-rho.vercel.app/', 'Vercel Frontend');
  await test('https://java-interwiew-tinder-production.up.railway.app/health', 'Railway Health');
  await test('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'Railway API no-origin');
  await test('https://solve-it-rho.vercel.app/api/languages', 'Vercel proxy API');
  await test('https://solve-it-rho.vercel.app/manifest.webmanifest', 'Vercel manifest');
  await test('https://solve-it-rho.vercel.app/sw.js', 'Vercel SW');
}

main();