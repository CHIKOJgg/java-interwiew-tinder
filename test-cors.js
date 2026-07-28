const http = require('https');

function testUrl(url, label, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('Status:', res.statusCode);
        console.log('CORS-Allow-Origin:', res.headers['access-control-allow-origin'] || 'MISSING');
        console.log('Body:', body.substring(0, 200));
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', (e) => {
      console.error(`[${label}] Error:`, e.message);
      resolve(null);
    });
    req.end();
  });
}

async function main() {
  await testUrl('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'Railway API (Vercel origin)', {
    'Origin': 'https://solve-it-rho.vercel.app'
  });
  await testUrl('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'Railway API (no origin)', {});
  await testUrl('https://java-interwiew-tinder-production.up.railway.app/api/public/stats', 'Railway public stats', {});

  const vercelScript = 'https://solve-it-rho.vercel.app/src/main.jsx';
  req = http.request(vercelScript, { method: 'GET' }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('\n=== Vercel main.jsx ===');
      console.log('Status:', res.statusCode);
      console.log('Content-Type:', res.headers['content-type']);
      console.log('Body length:', body.length);
      console.log('Body:', body.substring(0, 300));
    });
  });
  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
}

main();
