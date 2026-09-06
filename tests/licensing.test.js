import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));

test("custom license metadata is explicit and blocks accidental npm publication", () => {
  assert.equal(pkg.license, "SEE LICENSE IN LICENSE");
  assert.equal(pkg.private, true);
  assert.equal(pkg.homepage, "https://finnlyu41-tech.github.io/audit-project-workbench/");
});

test("the legacy MIT copyright and grant remain byte-for-byte unchanged", () => {
  const bytes = Buffer.from(read("licenses/MIT-legacy.txt"));
  const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(blob, "d52ec7e0c080ca679788d3876d2e0d453d746408");
  assert.equal(read("public/legal/MIT-legacy.txt"), bytes.toString());
});

test("the exact APW permission text accompanies static distributions", () => {
  assert.equal(read("LICENSE"), read("public/legal/APW-LICENSE.txt"));
  assert.match(read("LICENSE"), /^APW Proprietary License 1\.0/);
  assert.match(read("LICENSE"), /71ab2a080d2ccd9df2b75741eae81e3fe0f3d2fd/);
});

test("shipped dependency notices match the installed package licenses", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const paths = ["react", "react-dom", "lucide-react", "vite"].map((name) =>
    [name, join(root, "node_modules", name)]);
  paths.push(["scheduler", join(dirname(realpathSync(join(root, "node_modules/react-dom"))), "scheduler")]);
  for (const [name, dir] of paths) {
    const file = ["LICENSE", "LICENSE.md", "LICENSE.txt"].find((p) => existsSync(join(dir, p)));
    assert.ok(file, `${name}: missing upstream license`);
    assert.equal(read(`public/legal/${name}-LICENSE.txt`), readFileSync(join(dir, file), "utf8"), name);
    const dependency = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.ok(read("THIRD_PARTY_NOTICES.md").includes(`| ${name} | ${dependency.version} |`), name);
    assert.ok(read("public/legal/index.html").includes(`${name}-LICENSE.txt`), name);
  }
});

test("current documentation points to the explicit transition policy", () => {
  assert.ok(!read("README.md").includes("[MIT](LICENSE)"));
  assert.match(read("README.md"), /docs\/licensing\.md/);
  assert.match(read("CONTRIBUTING.md"), /written permission/);
  assert.match(read("docs/licensing.md"), /not proof of sole legal ownership/);
});
