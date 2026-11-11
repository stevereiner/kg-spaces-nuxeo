// After `npm install` in app/: a library tarball in docker/lib/ (from scripts/install-local-lib.sh, or put there by
// hand) is installed over the npm version, without changing app/package.json -- what the image's Dockerfile does, so
// `npm start` and an image build use the same library. Nothing in docker/lib/: the published version stays. A
// graph-view tarball there (the library's GRAPH tab view) is installed with it.
import { execSync } from 'node:child_process';
import { readdirSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'docker', 'lib');
const newest = (pattern) => readdirSync(lib)
  .filter((f) => pattern.test(f))
  .map((f) => join(lib, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const library = newest(/^flexible-graphrag-angular-ui-.*\.tgz$/);
const graphView = newest(/^flexible-graphrag-graph-view-.*\.tgz$/);

if (library) {
  const tarballs = graphView ? [library, graphView] : [library];
  console.log(`using the library tarball(s) ${tarballs.join(' ')}`);
  execSync(`npm install ${tarballs.map((t) => `"${t}"`).join(' ')} --no-save --no-audit --no-fund`,
           { cwd: join(root, 'app'), stdio: 'inherit' });
  // the version doesn't change between local packs: the Angular CLI would serve its old compiled copy
  rmSync(join(root, 'app', '.angular', 'cache'), { recursive: true, force: true });
}
