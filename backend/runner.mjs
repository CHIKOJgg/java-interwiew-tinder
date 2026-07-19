import { execSync } from 'node:child_process';
import fs from 'node:fs';
process.env.NODE_ENV = 'test';
const name = process.env.SPECNAME;
const out = execSync(`npx vitest run ${name} --reporter=verbose`, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
fs.writeFileSync('C:\\Users\\Honor\\AppData\\Local\\Temp\\opencode\\r2.txt', out);
console.log('WROTE FILE');
