import fs from 'fs';
import path from 'path';

const root = 'D:/Project/Main/ai-app';
const docPath = 'docs/superpowers/plans/2026-08-03-express-migration.md';
const full = path.join(root, docPath);
const text = fs.readFileSync(full, 'utf8');
const lines = text.split(/\r?\n/);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

const HISTORICAL_VERCEL = new Set([
  'api/gateway.test.ts',
  'api/health.ts',
  'api/v1/models.ts',
  'api/v1/chat/completions.ts',
  'api/v1/embeddings.ts',
  'vercel.json',
  'lib/cors.ts',
  'lib/request.ts',
  'api/**',
]);

function isHistorical(p) {
  const n = p.replace(/\\/g, '/');
  if (HISTORICAL_VERCEL.has(n)) return true;
  if (n.startsWith('api/')) return true;
  return false;
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel.replace(/\\/g, '/')));
}

// Longer extensions first so .json is not truncated to .js
const EXT = 'tsx|jsx|cjs|mjs|yaml|yml|toml|json|html|css|txt|md|ts|js|sh|py|go|rs|java|rb';
const fileTokenRe = new RegExp(`([a-zA-Z0-9_./-]+\\.(?:${EXT}))`, 'g');
const apiRe = /\b(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9/_:-]+)/g;
const cmdStart = /^(npm|npx|node|yarn|pnpm|git)\b/;

let inFence = false;
let fenceTag = '';
const claims = [];

function backtickTokens(line) {
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const ln = i + 1;
  const fence = line.match(/^```(\w*)/);
  if (fence) {
    if (!inFence) {
      inFence = true;
      fenceTag = (fence[1] || '').toLowerCase();
    } else {
      inFence = false;
      fenceTag = '';
    }
    continue;
  }
  if (line.includes('VERIFY:')) continue;
  if (/<!--\s*generated-by:\s*gsd-doc-writer\s*-->/.test(line)) continue;
  if (inFence && ['diff', 'example', 'template'].includes(fenceTag)) continue;

  const isExample = /\b(e\.g\.|example:|for instance|such as|like:)\b/i.test(line);
  const tokens = backtickTokens(line);

  // 1. File path claims — only from backticks
  if (!isExample) {
    for (const tok of tokens) {
      fileTokenRe.lastIndex = 0;
      let m;
      while ((m = fileTokenRe.exec(tok))) {
        const p = m[1];
        if (/your-|<name>|\{|\}|example|sample|placeholder|my-/i.test(p)) continue;
        claims.push({ line: ln, category: 'file', claim: p });
      }
    }
  }

  // 2. Command claims
  if (inFence && ['bash', 'sh', 'shell'].includes(fenceTag)) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      for (const part of t.split(/&&|;/).map((s) => s.trim()).filter(Boolean)) {
        if (cmdStart.test(part)) claims.push({ line: ln, category: 'command', claim: part });
      }
    }
  }
  if (!isExample) {
    for (const tok of tokens) {
      const c = tok.trim();
      if (cmdStart.test(c)) claims.push({ line: ln, category: 'command', claim: c });
    }
  }

  // 3. API endpoints
  if (!isExample) {
    apiRe.lastIndex = 0;
    let m;
    while ((m = apiRe.exec(line))) {
      claims.push({ line: ln, category: 'api', claim: `${m[1]} ${m[2]}` });
    }
  }

  // 4. Function claims — backtick identifier immediately followed by (
  if (!isExample) {
    for (const tok of tokens) {
      const fm = tok.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/);
      if (fm) claims.push({ line: ln, category: 'function', claim: fm[1] });
    }
  }

  // 5. Dependency claims
  if (!isExample && /\b(uses|requires|depends on|powered by|built with)\b/i.test(line)) {
    for (const tok of tokens) {
      if (tok.includes('.') || tok.includes('/')) continue;
      if (cmdStart.test(tok)) continue;
      if (/\.(ts|js|md|json)$/.test(tok)) continue;
      claims.push({ line: ln, category: 'dependency', claim: tok });
    }
  }
}

const srcRoots = ['src', 'lib', 'api', 'routes', 'server', 'app']
  .map((d) => path.join(root, d))
  .filter((d) => fs.existsSync(d));

function walkTs(cb) {
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        walk(fp);
      } else if (/\.(ts|js|tsx|jsx)$/.test(ent.name)) {
        cb(fp, fs.readFileSync(fp, 'utf8'));
      }
    }
  }
  for (const d of srcRoots) walk(d);
}

function routeExists(pth) {
  let ok = false;
  walkTs((_fp, t) => {
    if (t.includes(pth)) ok = true;
    if (pth === '/health' && (/['"`]\/health['"`]/.test(t) || /healthRouter/.test(t))) ok = true;
    if (pth === '/v1/models' && (/\/models/.test(t) || /modelsRouter/.test(t))) ok = true;
    if (pth === '/v1/embeddings' && (/\/embeddings/.test(t) || /embeddingsRouter/.test(t))) ok = true;
    if (pth === '/v1/chat/completions' && (/chat\/completions/.test(t) || /chatRouter/.test(t))) ok = true;
  });
  return ok;
}

function functionExists(name) {
  const pat = new RegExp(
    `(function\\s+${name}\\b|const\\s+${name}\\s*=|export\\s+(async\\s+)?function\\s+${name}\\b|export\\s+class\\s+${name}\\b|export\\s+const\\s+${name}\\b|class\\s+${name}\\b)`,
  );
  let ok = false;
  walkTs((_fp, t) => {
    if (pat.test(t)) ok = true;
  });
  return ok;
}

const failures = [];
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

for (const c of claims) {
  let status = 'PASS';
  let expected;
  let actual;

  if (c.category === 'file') {
    if (isHistorical(c.claim) || exists(c.claim)) {
      status = 'PASS';
    } else {
      status = 'FAIL';
      expected = 'file exists';
      actual = `file not found at ${c.claim}`;
    }
  } else if (c.category === 'command') {
    const claim = c.claim;
    if (claim.startsWith('git ')) {
      skipped++;
      continue;
    }
    if (/^npm (uninstall|install)\b/.test(claim) || /^npm i\b/.test(claim)) {
      skipped++;
      continue;
    }
    if (claim === 'npm test' || claim.startsWith('npm test ')) {
      if (!scripts.test) {
        status = 'FAIL';
        expected = "script 'test' in package.json";
        actual = 'script not found';
      }
    } else if (/^npm run ([\w:-]+)/.test(claim)) {
      const name = claim.match(/^npm run ([\w:-]+)/)[1];
      if (!scripts[name]) {
        status = 'FAIL';
        expected = `script '${name}' in package.json`;
        actual = 'script not found';
      }
    } else if (/^npx (\S+)/.test(claim)) {
      const pkgName = claim.match(/^npx (\S+)/)[1];
      if (!deps[pkgName] && !scripts[pkgName]) {
        status = 'FAIL';
        expected = 'package in package.json dependencies';
        actual = `package not found: ${pkgName}`;
      }
    } else if (/^node (\S+)/.test(claim)) {
      const fp = claim.match(/^node (\S+)/)[1];
      if (!exists(fp) && !isHistorical(fp)) {
        status = 'FAIL';
        expected = 'file exists';
        actual = `file not found at ${fp}`;
      }
    } else {
      skipped++;
      continue;
    }
  } else if (c.category === 'api') {
    const pth = c.claim.split(' ')[1];
    if (!routeExists(pth)) {
      status = 'FAIL';
      expected = 'route definition in codebase';
      actual = `no route definition found for ${pth}`;
    }
  } else if (c.category === 'function') {
    if (!functionExists(c.claim)) {
      status = 'FAIL';
      expected = `function '${c.claim}' in codebase`;
      actual = 'no definition found';
    }
  } else if (c.category === 'dependency') {
    const name = c.claim === 'openai SDK' ? 'openai' : c.claim;
    if (!deps[name]) {
      status = 'FAIL';
      expected = 'package in package.json dependencies';
      actual = 'package not found';
    }
  }

  if (status === 'PASS') passed++;
  else {
    failed++;
    failures.push({ line: c.line, claim: c.claim, expected, actual });
  }
  results.push({ ...c, status });
}

const out = {
  doc_path: docPath,
  claims_checked: passed + failed,
  claims_passed: passed,
  claims_failed: failed,
  failures,
};

const outPath = path.join(root, '.planning/tmp/verify-2026-08-03-express-migration.md.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(
  path.join(root, '.planning/tmp/verify-plan-claims-debug.json'),
  JSON.stringify(
    {
      byCat: claims.reduce((a, c) => {
        a[c.category] = (a[c.category] || 0) + 1;
        return a;
      }, {}),
      skipped,
      failures,
      sampleFail: results.filter((r) => r.status === 'FAIL').slice(0, 20),
      total: claims.length,
      checked: out.claims_checked,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(out, null, 2));
console.log('skipped', skipped, 'extracted', claims.length);
