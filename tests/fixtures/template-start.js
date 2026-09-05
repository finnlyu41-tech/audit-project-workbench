import { templateLibraryFixture } from './template-library.js';
import { makeNode } from '../../src/dashboard/model.js';
export function templateStartFixture() {
  const store = templateLibraryFixture();
  const beta = store.samples.find((sample) => sample.id === 'library-beta');
  beta.nodes = [makeNode({ title: 'Chosen nondefault procedure', conditions: ['Review this procedure'] })];
  beta.nodes[0].conditions[0].done = true;
  const group = structuredClone(store.groupSamples[0]);
  group.id = 'start-group'; group.name = 'Chosen consolidation example';
  group.nodes = [makeNode({ title: 'Chosen consolidation procedure', conditions: ['Consolidation review'] })];
  group.nodes[0].conditions[0].done = true;
  store.groupSamples.push(group);
  return store;
}
