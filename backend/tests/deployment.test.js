import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(ROOT, '..');

function readLines(filePath) {
  return readFileSync(resolve(ROOT, filePath), 'utf-8').split('\n');
}

describe('Dockerfile', () => {
  const path = 'Dockerfile';
  it('exists', () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true);
  });

  it('uses start:all as CMD', () => {
    const lines = readLines(path);
    const cmdLine = lines.find(l => l.includes('CMD') && l.includes('start:all'));
    expect(cmdLine).toBeDefined();
    expect(cmdLine).toContain('npm');
    expect(cmdLine).toContain('start:all');
  });

  it('uses node:22-alpine base image', () => {
    const lines = readLines(path);
    expect(lines.some(l => l.includes('FROM node:22-alpine'))).toBe(true);
  });

  it('has HEALTHCHECK', () => {
    const lines = readLines(path);
    expect(lines.some(l => l.includes('HEALTHCHECK'))).toBe(true);
  });
});

describe('railway.toml', () => {
  const path = 'railway.toml';
  it('exists in backend dir', () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true);
  });

  it('has valid TOML sections', () => {
    const lines = readLines(path);
    const sections = lines.filter(l => l.startsWith('['));
    expect(sections).toContain('[build]');
    expect(sections).toContain('[deploy]');
    expect(sections).toContain('[env]');
  });

  it('references Dockerfile for build', () => {
    const lines = readLines(path);
    const buildSection = lines.slice(0, lines.indexOf('[deploy]'));
    expect(buildSection.some(l => l.includes('Dockerfile'))).toBe(true);
  });

  it('sets PORT=10000', () => {
    const lines = readLines(path);
    const envSection = lines.slice(lines.indexOf('[env]'));
    expect(envSection.some(l => l.includes('PORT') && l.includes('10000'))).toBe(true);
  });

  it('sets NODE_ENV=production', () => {
    const lines = readLines(path);
    const envSection = lines.slice(lines.indexOf('[env]'));
    expect(envSection.some(l => l.includes('NODE_ENV') && l.includes('production'))).toBe(true);
  });
});

describe('start-all.mjs (process supervisor)', () => {
  const path = 'scripts/start-all.mjs';
  it('exists', () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true);
  });

  it('launches both api and worker', () => {
    const lines = readLines(path);
    expect(lines.some(l => l.includes("launch('api'") || l.includes('launch("api"'))).toBe(true);
    expect(lines.some(l => l.includes("launch('worker'") || l.includes('launch("worker"'))).toBe(true);
  });

  it('handles SIGTERM and SIGINT', () => {
    const lines = readLines(path);
    expect(lines.some(l => l.includes('SIGTERM'))).toBe(true);
    expect(lines.some(l => l.includes('SIGINT'))).toBe(true);
  });
});

describe('deploy workflow', () => {
  const path = resolve(REPO_ROOT, '.github/workflows/deploy.yml');
  it('exists', () => {
    expect(existsSync(path)).toBe(true);
  });

  it('triggers on main and staging push', () => {
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('branches: [ main, staging ]');
  });

  it('deploys frontend to Vercel', () => {
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('vercel-action');
    expect(content).toContain('working-directory: ./frontend');
  });

  it('has no Fly.io steps (migrated away)', () => {
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain('flyctl');
    expect(content).not.toContain('FLY_API_TOKEN');
  });
});

describe('package.json', () => {
  it('has start:all script', () => {
    const content = readFileSync(resolve(ROOT, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.scripts).toHaveProperty('start:all');
    expect(pkg.scripts['start:all']).toContain('start-all.mjs');
  });

  it('has production start command', () => {
    const content = readFileSync(resolve(ROOT, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.scripts).toHaveProperty('start');
  });

  it('has test runner configured (vitest)', () => {
    const content = readFileSync(resolve(ROOT, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.devDependencies).toHaveProperty('vitest');
  });
});

describe('secrets — no real credentials in tracked files', () => {
  const gitTrackedFiles = [
    resolve(ROOT, '.env.example'),
    resolve(REPO_ROOT, 'frontend/.env.example'),
    resolve(ROOT, 'Dockerfile'),
    resolve(ROOT, 'package.json'),
  ];

  const suspicious = [
    { pattern: /sk-or-[a-zA-Z0-9]{32,}/, hint: 'OpenRouter API key' },
    { pattern: /\b\d{9,10}:AA[a-zA-Z0-9_-]{30,}\b/, hint: 'Telegram bot token' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, hint: 'GitHub PAT' },
    { pattern: /gho_[a-zA-Z0-9]{36}/, hint: 'GitHub OAuth' },
  ];

  for (const file of gitTrackedFiles) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    for (const { pattern, hint } of suspicious) {
      it(`${resolve(file).split('/').pop()} has no ${hint}`, () => {
        expect(content).not.toMatch(pattern);
      });
    }
  }
});

describe('render.yaml', () => {
  it('is deprecated and references Railway', () => {
    const path = resolve(REPO_ROOT, 'render.yaml');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('DEPRECATED');
    expect(content).toContain('Railway');
  });
});

describe('Dockerfile production readiness', () => {
  const lines = readLines('Dockerfile');

  it('installs production deps only', () => {
    const npmCiLine = lines.find(l => l.includes('npm ci'));
    expect(npmCiLine).toBeDefined();
    expect(npmCiLine).toContain('--only=production');
  });

  it('cleans npm cache', () => {
    expect(lines.some(l => l.includes('npm cache clean'))).toBe(true);
  });

  it('exposes PORT through env variable in HEALTHCHECK', () => {
    const health = lines.find(l => l.includes('HEALTHCHECK'));
    expect(health).toBeDefined();
    const cmd = lines[lines.indexOf(health) + 1];
    expect(cmd).toContain('${PORT:-10000}');
  });

  it('EXPOSE uses PORT env var with Railway default', () => {
    const expose = lines.find(l => l.includes('EXPOSE'));
    expect(expose).toBeDefined();
    expect(expose).toContain('${PORT:-10000}');
  });
});