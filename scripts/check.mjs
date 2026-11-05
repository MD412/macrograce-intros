import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const ASSET_LIMIT = 3_000_000;
const SKILL_LIMIT = 200_000;
const EM_DASH = String.fromCodePoint(0x2014);
const SLASH = '/';
const STAR = '*';
const TEXT = new Set(['.md', '.json', '.js', '.mjs', '.css', '.html', '.yml', '.yaml', '.sh', '.txt']);
const errors = [];
const fail = (file, message) => errors.push(`${relative(root, file) || file}: ${message}`);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || /^\s/.test(line)) continue;
    const pair = line.match(/^([a-z][a-z0-9_-]*):(?:\s+(.*))?$/);
    if (!pair) return null;
    const value = (pair[2] ?? '').trim();
    const quoted = /^(".*"|'.*')$/.test(value);
    if (!quoted && value.includes(': ')) return null;
    fields[pair[1]] = quoted ? value.slice(1, -1) : value;
  }
  return fields;
}

function checkSkill(file, expectedName) {
  const fields = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!fields) return fail(file, 'missing or invalid YAML frontmatter');
  if (!fields.name) fail(file, 'frontmatter needs name');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fields.name)) fail(file, 'name must be lowercase and hyphenated');
  if (expectedName && fields.name !== expectedName) fail(file, `name must match folder ${expectedName}`);
  if (!fields.description) fail(file, 'frontmatter needs description');
  else {
    if (!fields.description.startsWith('Use when')) fail(file, 'description must start with "Use when"');
    if (fields.description.length > 1024) fail(file, 'description must be at most 1024 characters');
  }
}

function hasComment(file, line) {
  const ext = extname(file);
  const trimmed = line.trim();
  const block = SLASH + STAR;
  const inline = SLASH + SLASH;
  if (ext === '.yml' || ext === '.yaml' || ext === '.sh') return trimmed.startsWith('#') || /\s#\s/.test(line);
  if (ext === '.css') return line.includes(block);
  if (ext === '.html') return line.includes('<!--') || trimmed.startsWith(block) || trimmed.startsWith(inline);
  if (ext === '.js' || ext === '.mjs') return trimmed.startsWith(block) || trimmed.startsWith(inline) || line.includes(` ${inline} `);
  return false;
}

const skillsDir = join(root, 'skills');
const skillNames = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((name) => statSync(join(skillsDir, name)).isDirectory())
  : [];
if (!skillNames.length) fail(skillsDir, 'no skills found');

for (const name of skillNames) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) {
    fail(file, 'missing');
    continue;
  }
  checkSkill(file, name);
  const size = walk(join(skillsDir, name)).reduce((sum, path) => sum + statSync(path).size, 0);
  if (size > SKILL_LIMIT) fail(join(skillsDir, name), `${size} bytes is over the ${SKILL_LIMIT} byte budget`);
}

const template = join(root, 'template', 'SKILL.md');
if (existsSync(template)) checkSkill(template);
else fail(template, 'missing');

const assetsDir = join(root, 'assets');
if (existsSync(assetsDir)) {
  for (const path of walk(assetsDir)) {
    const size = statSync(path).size;
    if (size > ASSET_LIMIT) fail(path, `${size} bytes is over the ${ASSET_LIMIT} byte budget`);
  }
}

const marketplace = join(root, '.claude-plugin', 'marketplace.json');
if (existsSync(marketplace)) {
  try {
    const data = JSON.parse(readFileSync(marketplace, 'utf8'));
    if (!data.name || !data.owner?.name) fail(marketplace, 'needs name and owner.name');
    const plugins = data.plugins ?? [];
    for (const plugin of plugins) {
      if (!plugin.name || !plugin.source) fail(marketplace, 'each plugin needs name and source');
      for (const path of plugin.skills ?? []) {
        if (!existsSync(join(root, path, 'SKILL.md'))) fail(marketplace, `${plugin.name} points to missing ${path}`);
      }
    }
    for (const name of skillNames) {
      if (!plugins.some((plugin) => plugin.name === name)) fail(marketplace, `${name} is not listed`);
    }
  } catch (error) {
    fail(marketplace, `invalid JSON: ${error.message}`);
  }
} else fail(marketplace, 'missing');

for (const path of walk(root)) {
  if (!TEXT.has(extname(path))) continue;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes(EM_DASH)) fail(path, `em dash on line ${index + 1}`);
    if (hasComment(path, line)) fail(path, `comment on line ${index + 1}`);
  });
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}

console.log(`ok: ${skillNames.length} skills, frontmatter, budgets, marketplace, copy rules`);
