const http = require('https');

function test(url, label, method, headers, body) {
  return new Promise((resolve) => {
    const opts = { method: method || 'GET', headers: headers || {} };
    const r = http.request(url, opts, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('URL:', url);
        console.log('Method:', method);
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('CORS-Allow-Origin:', res.headers['access-control-allow-origin'] || 'MISSING');
        console.log('Body:', respBody.substring(0, 500));
        resolve({ status: res.statusCode, body: respBody });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // Test Vercel proxy with OPTIONS preflight
  await test('https://solve-it-rho.vercel.app/api/languages', 'Vercel proxy OPTIONS', 'OPTIONS', {
    'Origin': 'https://solve-it-rho.vercel.app',
    'Access-Control-Request-Method': 'GET'
  });

  // Test Vercel proxy with GET (no CORS issue expected)
  await test('https://solve-it-rho.vercel.app/api/languages', 'Vercel proxy GET', 'GET');

  // Test Railway directly with POST (login endpoint)
  await test('https://java-interwiew-tinder-production.up.railway.app/api/auth/login', 'Railway POST login', 'POST', {
    'Content-Type': 'application/json',
    'Origin': 'https://solve-it-rho.vercel.app'
  }, JSON.stringify({ provider: 'telegram', initData: 'test' }));
}

main();