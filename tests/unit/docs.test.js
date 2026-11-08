import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDoc } from '../../src/content/doc.js';
import { docTopicFor, officialUrl, docHash, DOC_TOPICS } from '../../src/content/docs-topics.js';
import { parseHash, buildHash } from '../../src/router.js';

const card = (body, fm = 'title: git x\nsummary: s\nsyntax: git x') => `---\n${fm}\n---\n\n${body}`;

test('parseDoc reads the front matter and the four sections', () => {
  const d = parseDoc(card('## What it does\n\nA.\n\n## In the game\n\nB.\n\n## Example\n\n- `git x`\n\n## Watch out\n\nC.', 'title: git x\nsummary: s\nsyntax: git x <a>\nsee: [merge, rebase]'));
  assert.deepEqual(d.errors, []);
  assert.equal(d.syntax, 'git x <a>');
  assert.deepEqual(d.see, ['merge', 'rebase']);
  assert.deepEqual(d.sections.map((s) => s.key), ['what', 'game', 'example', 'watch']);
});

test('parseDoc reports missing, unknown and empty sections', () => {
  const msgs = parseDoc(card('## Exemple\n\nA.\n\n## What it does\n\n')).errors.map((e) => e.message).join(' | ');
  assert.match(msgs, /unknown section "## Exemple"/);
  assert.match(msgs, /"## What it does" is empty/);
  assert.match(msgs, /missing section "## In the game"/);
  assert.match(parseDoc('---\ntitle: a\n---\n').errors.map((e) => e.message).join(' '), /missing front matter key "summary"/);
});

test('docTopicFor maps typed commands to a card', () => {
  assert.equal(docTopicFor('git merge ia/resume'), 'merge');
  assert.equal(docTopicFor('git rebase -i HEAD~3'), 'rebase');
  assert.equal(docTopicFor('git worktree add ../x -b y'), 'worktree');
  assert.equal(docTopicFor('cd ../rpt-ia'), 'cd');
  assert.equal(docTopicFor('ls'), 'cd');
  assert.equal(docTopicFor('approve MR !42'), 'mr');
  assert.equal(docTopicFor('fork'), 'fork');
  assert.equal(docTopicFor('help push'), 'push');
  assert.equal(docTopicFor('git mrege x'), 'merge');
  assert.equal(docTopicFor('git frobnicate'), null);
  assert.equal(docTopicFor('git'), null);
  assert.equal(docTopicFor(''), null);
});

test('official links follow the language, with no page for cd', () => {
  assert.equal(officialUrl('merge', 'fr'), 'https://git-scm.com/docs/git-merge/fr');
  assert.equal(officialUrl('merge', 'en'), 'https://git-scm.com/docs/git-merge');
  assert.match(officialUrl('mr', 'fr'), /^https:\/\/docs\.github\.com\/fr\//);
  assert.equal(officialUrl('cd', 'fr'), null);
  assert.equal(officialUrl('nope', 'fr'), null);
  for (const id of DOC_TOPICS) if (id !== 'cd') assert.ok(officialUrl(id, 'en'), id);
});

test('docs routes', () => {
  assert.deepEqual(parseHash('#/docs'), { name: 'docs' });
  assert.deepEqual(parseHash('#/docs/merge'), { name: 'docs', id: 'merge' });
  assert.deepEqual(parseHash('#/docs/a/b'), { name: 'home' });
  assert.equal(buildHash({ name: 'docs', id: 'merge' }), docHash('merge'));
  assert.equal(buildHash({ name: 'docs' }), docHash());
});
