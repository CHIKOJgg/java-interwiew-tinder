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

async function main() {
  const bundle = await test('https://solve-it-rho.vercel.app/assets/index-B4vesOaR.js', 'JS bundle');
  if (bundle && bundle.body) {
    // Search for railway URL
    if (bundle.body.includes('railway')) {
      console.log('\nFound "railway" in bundle!');
      const idx = bundle.body.indexOf('railway');
      console.log('Context:', bundle.body.substring(Math.max(0, idx - 100), idx + 200));
    } else {
      console.log('\nNo "railway" found in bundle');
    }

    // Search for "java-inter"
    if (bundle.body.includes('java-inter')) {
      console.log('\nFound "java-inter" in bundle!');
      const idx = bundle.body.indexOf('java-inter');
      console.log('Context:', bundle.body.substring(Math.max(0, idx - 100), idx + 200));
    } else {
      console.log('\nNo "java-inter" found in bundle');
    }

    // Search for "interwiew" (typo URL)
    if (bundle.body.includes('interwiew')) {
      console.log('\nFound "interwiew" (typo) in bundle!');
      const idx = bundle.body.indexOf('interwiew');
      console.log('Context:', bundle.body.substring(Math.max(0, idx - 50), idx + 150));
    } else {
      console.log('\nNo "interwiew" found in bundle');
    }

    // Search for "baseUrl" or "API_BASE_URL"
    const baseUrlPatterns = ['baseUrl', 'base_url', 'API_BASE', 'apiBaseUrl', 'api_url'];
    for (const p of baseUrlPatterns) {
      if (bundle.body.includes(p)) {
        const idx = bundle.body.indexOf(p);
        console.log(`\nFound "${p}" in bundle:`);
        console.log(bundle.body.substring(Math.max(0, idx - 50), idx + 200));
        break;
      }
    }
  }
}

main();