import axios from 'axios';

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_MAP = {
  Java: { language: 'java', version: '15' },
  Python: { language: 'python', version: '3.10' },
  TypeScript: { language: 'typescript', version: '5.0' },
};

const DENIED_PATTERNS = [
  /java\.net\./, /java\.io\.File/, /Runtime\.getRuntime/,
  /ProcessBuilder/, /Socket/, /ServerSocket/,
  /java\.lang\.reflect/, /UNSAFE/i,
];

function validateCode(code, language) {
  if (code.length > 5000) throw new Error('Code too long (max 5KB)');
  if (language === 'Java') {
    for (const pattern of DENIED_PATTERNS) {
      if (pattern.test(code)) throw new Error(`Use of ${pattern} is not allowed`);
    }
  }
}

export async function executeCode({ code, language, stdin = '' }) {
  validateCode(code, language);

  const config = LANGUAGE_MAP[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  const response = await axios.post(PISTON_API, {
    language: config.language,
    version: config.version,
    files: [{ content: code }],
    stdin,
    compile_timeout: 10000,
    run_timeout: 5000,
  }, { timeout: 20000 });

  return {
    output: response.data.run.output,
    stderr: response.data.run.stderr,
    exitCode: response.data.run.code,
    signal: response.data.run.signal || null,
  };
}
