import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for environment loading. Importing this module
// guarantees `.env` is parsed BEFORE any other module reads process.env.
// This prevents the classic bug where top-level constants like
// `const TG_API = ...process.env.BOT_TOKEN` capture `undefined` because the
// module was imported before `dotenv.config()` ran.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default process.env;
