import test from "node:test";
import assert from "node:assert/strict";
import { filterTemplateLibrary } from "../src/dashboard/template-library-view.js";
import { templateLibraryFixture } from "./fixtures/template-library.js";

test("library combines normalized name description version and tag tokens", () => {
  const { samples } = templateLibraryFixture();
  assert.deepEqual(filterTemplateLibrary(samples, { query: "ＡＬＰＨＡ ２０２６ review" }).map((item) => item.id), ["library-alpha"]);
  assert.equal(filterTemplateLibrary(samples, { query: "alpha beta" }).length, 0);
  assert.equal(filterTemplateLibrary(samples, { query: "document" }).length, 3);
});
test("exact tag filters combine with search without changing tag semantics", () => {
  const { samples } = templateLibraryFixture();
  assert.equal(filterTemplateLibrary(samples, { query: "alpha", tag: "review" }).length, 1);
  assert.equal(filterTemplateLibrary(samples, { query: "alpha", tag: "beta" }).length, 0);
  assert.equal(filterTemplateLibrary(samples, { tag: "REVIEW" }).length, 0);
});
test("library sorting preserves existing name and timestamp order without mutating input", () => {
  const { samples } = templateLibraryFixture(); const before = JSON.stringify(samples);
  assert.deepEqual(filterTemplateLibrary(samples).map((item) => item.id), ["library-alpha", "library-tax", "library-beta"]);
  assert.deepEqual(filterTemplateLibrary(samples, { sort: "name" }).map((item) => item.id), ["library-alpha", "library-beta", "library-tax"]);
  assert.deepEqual(filterTemplateLibrary(samples, { sort: "created" }), samples);
  assert.equal(JSON.stringify(samples), before);
  assert.equal(filterTemplateLibrary(samples)[0], samples[0]);
});
test("workflow instructions criteria and provenance are not indexed", () => {
  const { samples, groupSamples } = templateLibraryFixture();
  samples[0].provenance = { note: "PRIVATEPROVENANCE" };
  for (const query of ["NOTINDEXEDSTAGETEXT", "NOTINDEXEDCRITERION", "PRIVATEPROVENANCE"]) {
    assert.deepEqual(filterTemplateLibrary(samples, { query }), []);
  }
  groupSamples[0].readinessTemplates.internal_team = [{ label: "PRIVATEGROUPCRITERION" }];
  assert.deepEqual(filterTemplateLibrary(groupSamples, { query: "PRIVATEGROUPCRITERION" }), []);
});
test("group metadata uses the same filters and leaves existing engagement content intact", () => {
  const store = templateLibraryFixture(); const before = JSON.stringify(store);
  assert.equal(filterTemplateLibrary(store.groupSamples, { query: "holding 2026", tag: "review" }).length, 1);
  assert.equal(filterTemplateLibrary(store.groupSamples, { query: "alpha" }).length, 0);
  assert.equal(JSON.stringify(store), before);
});
test("empty libraries and optional metadata remain valid and localized content is searchable", () => {
  assert.deepEqual(filterTemplateLibrary([], { query: "any" }), []);
  const samples = [{ id: "zh", name: "香港审计范本" }, { id: "hant", name: "香港審計範本" }];
  assert.equal(filterTemplateLibrary(samples, { query: "审计" })[0].id, "zh");
  assert.equal(filterTemplateLibrary(samples, { query: "審計" })[0].id, "hant");
  assert.equal(filterTemplateLibrary(samples, { query: "　 " }).length, 2);
});
