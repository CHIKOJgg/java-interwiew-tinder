const http = require('https');

function test(url, label) {
  return new Promise((resolve) => {
    const r = http.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('URL:', url);
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Content-Length:', res.headers['content-length'] || body.length);
        console.log('Body (first 500):', body.substring(0, 500));
        resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    r.end();
  });
}

async function main() {
  await test('https://solve-it-rho.vercel.app/main.jsx', 'main.jsx direct');
  await test('https://solve-it-rho.vercel.app/src/main.jsx', 'src/main.jsx direct');
  await test('https://solve-it-rho.vercel.app/assets/index.js', 'assets/index.js');
  await test('https://solve-it-rho.vercel.app/_next/static/chunks/pages/_app.js', '_app.js');
  await test('https://solve-it-rho.vercel.app/index.html', 'index.html check');
  await test('https://solve-it-rho.vercel.app/landing.html', 'landing.html');
}

main();