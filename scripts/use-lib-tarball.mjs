// After `npm install` in app/: a library tarball in docker/lib/ (from scripts/install-local-lib.sh, or put there by
// hand) is installed over the npm version, without changing app/package.json -- what the image's Dockerfile does, so
// `npm start` and an image build use the same library. Nothing in docker/lib/: the published version stays.
import { execSync } from 'node:child_process';
import { readdirSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'docker', 'lib');
const tarballs = readdirSync(lib)
  .filter((f) => /^flexible-graphrag-angular-ui-.*\.tgz$/.test(f))
  .map((f) => join(lib, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

if (tarballs.length) {
  console.log(`using the library tarball ${tarballs[0]}`);
  execSync(`npm install "${tarballs[0]}" --no-save --no-audit --no-fund`, { cwd: join(root, 'app'), stdio: 'inherit' });
  // the version doesn't change between local packs: the Angular CLI would serve its old compiled copy
  rmSync(join(root, 'app', '.angular', 'cache'), { recursive: true, force: true });
}
