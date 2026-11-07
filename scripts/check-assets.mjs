import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const manifestPath = 'point-clouds-manifest.json';
const fail = (message) => { throw new Error(message); };

export function manifestFiles(manifest) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.releases) || !manifest.releases.length) {
    fail('Expected schemaVersion 1 and at least one immutable release.');
  }
  const files = new Map();
  const releases = new Set();
  for (const release of manifest.releases) {
    if (!release.id || releases.has(release.id) || release.immutable !== true || !/^[a-f0-9]{40}$/.test(release.dataVersion)) {
      fail('Release IDs must be unique, immutable, and have a full data-version hash.');
    }
    releases.add(release.id);
    if (!Array.isArray(release.files) || !release.files.length) fail(`Empty release: ${release.id}`);
    for (const file of release.files) {
      if (!/^point-clouds\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.pnts$/.test(file.path) || files.has(file.path)) {
        fail(`Unsafe or duplicate asset path: ${file.path}`);
      }
      if (!Number.isSafeInteger(file.bytes) || file.bytes <= 0 || !/^[a-f0-9]{40}$/.test(file.gitBlobSha) || !/^[a-f0-9]{64}$/.test(file.sha256)) {
        fail(`Invalid byte length or hash: ${file.path}`);
      }
      files.set(file.path, file);
    }
  }
  return files;
}

export function assertImmutable(previous, current) {
  const oldFiles = manifestFiles(previous);
  const newFiles = manifestFiles(current);
  for (const [path, old] of oldFiles) {
    const next = newFiles.get(path);
    if (!next || ['bytes', 'gitBlobSha', 'sha256'].some(key => next[key] !== old[key])) {
      fail(`Previously published asset must remain unchanged: ${path}`);
    }
  }
}

export function checkIndex(manifest, indexText) {
  const expected = manifestFiles(manifest);
  const found = new Set();
  for (const record of indexText.split('\0').filter(Boolean)) {
    const match = /^(\d+) ([a-f0-9]{40}) ([0-3])\t(.+)$/.exec(record);
    if (!match) fail('Malformed Git index entry.');
    const [, mode, sha, stage, path] = match;
    if (!path.endsWith('.pnts')) continue;
    if (stage !== '0' || mode !== '100644') fail(`Asset must be a regular, resolved file: ${path}`);
    const file = expected.get(path);
    if (!file) fail(`Unlisted point cloud: ${path}`);
    if (sha !== file.gitBlobSha) fail(`Point-cloud bytes changed: ${path}`);
    found.add(path);
  }
  for (const path of expected.keys()) {
    if (!found.has(path)) fail(`Missing point cloud: ${path}`);
  }
  return { files: expected.size, bytes: [...expected.values()].reduce((sum, f) => sum + f.bytes, 0) };
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--base')) fail('Usage: node scripts/check-assets.mjs [--base <commit-sha>]');
  const base = args[1];
  if (base && !/^[a-f0-9]{40}$/.test(base)) fail('The baseline must be a full Git commit SHA.');
  // An all-zero push.before means the branch has just been created.
  if (base && base !== '0'.repeat(40)) {
    try { git('cat-file', '-e', `${base}^{commit}`); }
    catch { fail(`Baseline commit is unavailable; fetch it before checking: ${base}`); }
    // ls-tree distinguishes a first-time manifest from a failed Git lookup.
    if (git('ls-tree', base, '--', manifestPath).trim()) {
      assertImmutable(JSON.parse(git('show', `${base}:${manifestPath}`)), manifest);
    } else {
      // Bootstrap still preserves point clouds that predate the first manifest.
      const current = manifestFiles(manifest);
      for (const entry of git('ls-tree', '-r', '-z', base, '--', 'point-clouds').split('\0').filter(Boolean)) {
        const match = /^\d+ blob ([a-f0-9]{40})\t(.+\.pnts)$/.exec(entry);
        if (match && current.get(match[2])?.gitBlobSha !== match[1]) fail(`Previously published asset must remain unchanged: ${match[2]}`);
      }
    }
  }
  // Local working changes and a single recent commit receive an extra check.
  // CI's explicit event baseline above also covers pushes with many commits.
  for (const ref of ['HEAD', 'HEAD^']) {
    let previous;
    try { previous = git('show', `${ref}:${manifestPath}`); }
    catch { continue; }
    assertImmutable(JSON.parse(previous), manifest);
  }
  const result = checkIndex(manifest, git('ls-files', '--stage', '-z', '--', 'point-clouds'));
  const unstaged = git('diff-files', '--name-only', '--', 'point-clouds').trim();
  if (unstaged) fail(`Stage and validate the point-cloud changes before committing:\n${unstaged}`);
  console.log(`Verified ${result.files} immutable point clouds (${result.bytes.toLocaleString('en-US')} bytes) from Git blob identities.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
