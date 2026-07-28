const http = require('https');

function test(url, label) {
  return new Promise((resolve) => {
    const r = http.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n=== ${label} ===`);
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Length:', body.length);
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    r.end();
  });
}

async function main() {
  // Check what VITE_API_URL is in the built JS
  const bundle = await test('https://solve-it-rho.vercel.app/assets/index-B4vesOaR.js', 'JS bundle');
  if (bundle && bundle.body) {
    // Look for VITE_API_URL usage
    const apiUrlMatches = bundle.body.match(/https?:\/\/[^\s"']+api[^\s"']*/g);
    if (apiUrlMatches) {
      console.log('\n=== API URLs found in JS bundle ===');
      const unique = [...new Set(apiUrlMatches)];
      unique.forEach(u => console.log(u));
    }

    // Check for VITE_ env vars
    const viteMatches = bundle.body.match(/VITE_[A-Z_]+/g);
    if (viteMatches) {
      console.log('\n=== VITE_ vars found ===');
      const unique = [...new Set(viteMatches)];
      unique.forEach(v => console.log(v));
    }

    // Check for the API_BASE_URL assignment
    const baseUrlMatch = bundle.body.match(/API_BASE_URL[^\n;]{0,200}/);
    if (baseUrlMatch) {
      console.log('\n=== API_BASE_URL context ===');
      console.log(baseUrlMatch[0]);
    }
  }
}

main();