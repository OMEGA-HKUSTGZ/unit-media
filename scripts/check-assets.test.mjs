import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertImmutable, checkIndex, manifestFiles } from './check-assets.mjs';

const manifest = JSON.parse(readFileSync(new URL('../point-clouds-manifest.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(manifest);
const index = () => [...manifestFiles(manifest).values()].map(f => `100644 ${f.gitBlobSha} 0\t${f.path}\0`).join('');

test('current frozen files match the documented total without reading binary blobs', () => {
  assert.deepEqual(checkIndex(manifest, index()), { files: 6, bytes: 180977460 });
});

test('detects replaced, missing, and undeclared point clouds', () => {
  const first = manifest.releases[0].files[0];
  assert.throws(() => checkIndex(manifest, index().replace(first.gitBlobSha, '0'.repeat(40))), /bytes changed/);
  assert.throws(() => checkIndex(manifest, index().split('\0').slice(1).join('\0')), /Missing point cloud/);
  assert.throws(() => checkIndex(manifest, index() + `100644 ${first.gitBlobSha} 0\tpoint-clouds/new.pnts\0`), /Unlisted/);
});

test('rejects conflicted and symlink assets', () => {
  assert.throws(() => checkIndex(manifest, index().replace(' 0\t', ' 1\t')), /regular, resolved/);
  assert.throws(() => checkIndex(manifest, index().replace('100644', '120000')), /regular, resolved/);
});

test('rejects traversal, duplicate paths, and invalid digests', () => {
  const m = clone();
  m.releases[0].files[0].path = 'point-clouds/../escape.pnts';
  assert.throws(() => manifestFiles(m), /Unsafe/);
  const duplicate = clone();
  duplicate.releases[0].files.push(duplicate.releases[0].files[0]);
  assert.throws(() => manifestFiles(duplicate), /duplicate/);
  const badHash = clone();
  badHash.releases[0].files[0].sha256 = 'bad';
  assert.throws(() => manifestFiles(badHash), /Invalid/);
});

test('a manifest edit cannot silently replace or remove previously published bytes', () => {
  const replaced = clone();
  replaced.releases[0].files[0].gitBlobSha = '0'.repeat(40);
  assert.throws(() => assertImmutable(manifest, replaced), /must remain unchanged/);
  const removed = clone();
  removed.releases[0].files.pop();
  assert.throws(() => assertImmutable(manifest, removed), /must remain unchanged/);
});

test('new version directories can be added while retaining all old URLs', () => {
  const next = clone();
  next.releases.push({
    id: 'v2', dataVersion: '1'.repeat(40), immutable: true,
    files: [{ ...next.releases[0].files[0], path: 'point-clouds/version2/drift.pnts' }],
  });
  assert.doesNotThrow(() => assertImmutable(manifest, next));
});

test('an explicit published baseline detects mutation hidden behind a later documentation commit', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'unit-media-baseline-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const script = fileURLToPath(new URL('./check-assets.mjs', import.meta.url));
  try {
    git('init');
    git('config', 'user.name', 'Asset check test');
    git('config', 'user.email', 'asset-test@example.invalid');
    mkdirSync(join(cwd, 'point-clouds'));
    const writeRelease = (bytes) => {
      writeFileSync(join(cwd, 'point-clouds/test.pnts'), bytes);
      const snapshot = {
        schemaVersion: 1,
        releases: [{ id: 'v1', dataVersion: '1'.repeat(40), immutable: true, files: [{
          path: 'point-clouds/test.pnts', bytes: Buffer.byteLength(bytes),
          gitBlobSha: git('hash-object', 'point-clouds/test.pnts'),
          sha256: createHash('sha256').update(bytes).digest('hex'),
        }] }],
      };
      writeFileSync(join(cwd, 'point-clouds-manifest.json'), JSON.stringify(snapshot));
    };
    writeRelease('original bytes');
    git('add', '.');
    git('commit', '-m', 'Published baseline');
    const baseline = git('rev-parse', 'HEAD');
    writeRelease('different bytes');
    git('add', '.');
    git('commit', '-m', 'Incorrectly replace a frozen resource and its manifest');
    writeFileSync(join(cwd, 'README.md'), 'Documentation only');
    git('add', '.');
    git('commit', '-m', 'Later documentation edit');
    const result = spawnSync(process.execPath, [script, '--base', baseline], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Previously published asset must remain unchanged/);
    const unavailable = spawnSync(process.execPath, [script, '--base', 'f'.repeat(40)], { cwd, encoding: 'utf8' });
    assert.equal(unavailable.status, 1);
    assert.match(unavailable.stderr, /Baseline commit is unavailable/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
