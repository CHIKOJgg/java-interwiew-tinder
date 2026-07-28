const http = require('https');

function testUrl(url, label, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('Status:', res.statusCode);
        for (const [k, v] of Object.entries(res.headers)) {
          if (k.includes('access') || k.includes('cors') || k.includes('origin')) {
            console.log(k + ':', v);
          }
        }
        console.log('Body length:', body.length);
        if (body.length < 500) console.log('Body:', body);
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

async function preflight(url, origin) {
  return new Promise((resolve) => {
    const req = http.request(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== Preflight ${url} from ${origin} ===`);
        console.log('Status:', res.statusCode);
        for (const [k, v] of Object.entries(res.headers)) {
          if (k.includes('access') || k.includes('cors')) {
            console.log(k + ':', v);
          }
        }
        console.log('Body:', body.substring(0, 500));
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', (e) => {
      console.error('Error:', e.message);
      resolve(null);
    });
    req.end();
  });
}

async function main() {
  await preflight('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'https://solve-it-rho.vercel.app');
  await preflight('https://java-interwiew-tinder-production.up.railway.app/api/languages', 'http://localhost:5173');
  await testUrl('https://solve-it-rho.vercel.app/_next/static/chunks/pages/_app.js', 'Vercel JS bundle check');
  await testUrl('https://solve-it-rho.vercel.app/assets/index-', 'Vercel assets check (partial)');
}

main();
