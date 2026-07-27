import axios from 'axios';
import logger from '../config/logger.js';

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
  if (code.length > 5000) {
    logger.warn({ codeLength: code.length, language }, 'Code too long');
    throw new Error('Code too long (max 5KB)');
  }
  if (language === 'Java') {
    for (const pattern of DENIED_PATTERNS) {
      if (pattern.test(code)) {
        logger.warn({ language, pattern: pattern.source }, 'Denied pattern in code');
        throw new Error(`Use of ${pattern} is not allowed`);
      }
    }
  }
}

export async function executeCode({ code, language, stdin = '' }) {
  try {
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
  } catch (err) {
    if (err.response) {
      logger.error({ err, language, status: err.response.status }, 'Piston API execution failed');
    } else if (err.code === 'ECONNABORTED') {
      logger.error({ err, language }, 'Code execution timed out');
    } else {
      logger.error({ err, language }, 'executeCode failed');
    }
    throw err;
  }
}
