const http = require('https');

function testUrl(url, label) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('URL:', url);
        console.log('Status:', res.statusCode);
        console.log('CORS-Allow-Origin:', res.headers['access-control-allow-origin'] || 'MISSING');
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Body length:', body.length);
        console.log('Body:', body.substring(0, 300));
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
  await testUrl('https://solve-it-rho.vercel.app/', 'Vercel Frontend');
  await testUrl('https://java-interwiew-tinder-production.up.railway.app/health', 'Railway Health');
  await testUrl('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'Railway API (no origin)');
  await testUrl('https://solve-it-rho.vercel.app/api/languages', 'Vercel proxy -> API');
  resolve(null);
}

main();
