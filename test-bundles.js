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
        console.log('Body:', body.substring(0, 1000));
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', (e) => { console.error('Error:', e.message); resolve(null); });
    r.end();
  });
}

async function main() {
  const html = await test('https://solve-it-rho.vercel.app/', 'index.html');
  if (html && html.body) {
    const scriptMatches = html.body.match(/src="([^"]+\.js[^"]*)"/g);
    const cssMatches = html.body.match(/href="([^"]+\.css[^"]*)"/g);
    console.log('\n=== Scripts found in index.html ===');
    if (scriptMatches) scriptMatches.forEach(s => console.log(s));
    console.log('\n=== CSS found in index.html ===');
    if (cssMatches) cssMatches.forEach(s => console.log(s));

    if (scriptMatches) {
      for (const s of scriptMatches) {
        const src = s.match(/src="([^"]+)"/)[1];
        await test('https://solve-it-rho.vercel.app' + src, 'JS bundle: ' + src);
      }
    }
  }
}

main();