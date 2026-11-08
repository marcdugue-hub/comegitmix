import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { runSetup } from '../../src/engine/setup.js';
import { parseWebAction } from '../../src/engine/remote.js';
import { pickAiFiles } from '../../src/engine/ai.js';
import { getDesk } from '../../src/engine/state.js';
import { play, run, status, deepFreeze } from './_engine-helpers.js';

const setup = (text, opts) => {
  const r = runSetup(text, opts);
  assert.equal(r.error, null, `${r.line}: ${r.text} -> ${JSON.stringify(r.error)}`);
  return deepFreeze(r.state);
};

const TEAM = `
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@remote origin
`;

test('@remote origin publishes every branch, sets origin/<b> refs and upstreams', () => {
  const s = setup(TEAM);
  assert.equal(s.remotes.origin.branches.main.tip, s.branches.main.tip);
  assert.equal(s.remoteRefs['origin/main'].tip, s.branches.main.tip);
  assert.equal(s.branches.main.upstream, 'origin/main');
  assert.ok(s.remotes.origin.commits[s.branches.main.tip]);
});

test('push sends the commits; a colleague push makes the next push rejected; fetch then pull integrate', () => {
  let s = setup(TEAM);
  s = play(s, [{ name: 'touch', args: ['intro.md'] }, 'git commit -am "intro"']).state;
  assert.notEqual(s.remoteRefs['origin/main'].tip, s.branches.main.tip);
  const pushed = run(s, 'git push');
  assert.equal(pushed.error, null);
  assert.ok(pushed.events.some((e) => e.type === 'push.done'));
  assert.equal(pushed.state.remotes.origin.branches.main.tip, pushed.state.branches.main.tip);
  assert.equal(pushed.state.remoteRefs['origin/main'].tip, pushed.state.branches.main.tip);
  assert.equal(run(pushed.state, 'git push').state, pushed.state, 'up to date: read only');

  s = play(pushed.state, [{ name: 'colleague', args: ['main'], options: { message: 'fix' } }, { name: 'touch', args: ['resume.md'] }, 'git commit -am "resume"']).state;
  const colleagueTip = s.remotes.origin.branches.main.tip;
  assert.equal(s.remotes.origin.commits[colleagueTip].msg, 'fix');
  assert.ok(!s.commits[colleagueTip], 'not fetched yet');
  const rejected = run(s, 'git push');
  assert.equal(rejected.error.key, 'error.pushRejected');
  assert.equal(rejected.state, s);

  const fetched = run(s, 'git fetch');
  assert.equal(fetched.error, null);
  assert.equal(fetched.state.remoteRefs['origin/main'].tip, colleagueTip);
  assert.equal(fetched.state.branches.main.tip, s.branches.main.tip, 'fetch does not move main');
  const pulled = run(fetched.state, 'git pull');
  assert.equal(pulled.error, null);
  assert.equal(pulled.warning, null, 'the colleague changed a file not touched locally: no conflict');
  const merge = pulled.state.commits[pulled.state.branches.main.tip];
  assert.deepEqual(merge.parents, [s.branches.main.tip, colleagueTip]);
  assert.equal(run(pulled.state, 'git push').error, null);
});

test('a colleague push on the same file (files=) makes pull conflict', () => {
  let s = setup(`${TEAM}@colleague main "chiffres" files=plan.md\n@work plan.md\ngit commit -m "mine"`);
  const r = run(s, 'git pull');
  assert.equal(r.error, null);
  assert.equal(r.warning.key, 'error.mergeConflict');
  assert.equal(status(r.state, 'plan.md'), 'conflict');
  assert.equal(r.explanation.key, 'explain.pull.conflict');
});

test('push --force rewrites the remote branch with a warning; push -u sets the upstream', () => {
  let s = setup(`${TEAM}@colleague main "x"\n@work intro.md\ngit commit -m "mine"`);
  const r = run(s, 'git push --force-with-lease');
  assert.equal(r.error, null);
  assert.equal(r.warning.key, 'warn.forcePush');
  s = play(s, ['git switch -c ia/x', { name: 'touch', args: ['plan.md'] }, 'git commit -am "x"']).state;
  const u = run(s, 'git push -u origin ia/x');
  assert.equal(u.error, null);
  assert.equal(u.state.branches['ia/x'].upstream, 'origin/ia/x');
  assert.equal(u.explanation.key, 'explain.push.new');
});

test('fork copies upstream into origin; errors without upstream or when origin exists', () => {
  const s = setup(`@files plan.md\ngit commit -m "init"\n@remote upstream`, { repos: ['local', 'upstream'] });
  assert.ok(!s.remoteRefs['upstream/main'], 'no upstream chips until fetched');
  const r = run(s, 'fork');
  assert.equal(r.error, null);
  assert.equal(r.state.remotes.origin.forkOf, 'upstream');
  assert.equal(r.state.remoteRefs['origin/main'].tip, s.branches.main.tip);
  assert.ok(r.state.visibleRepos.includes('origin'));
  assert.equal(run(r.state, 'fork').error.key, 'error.remoteExists');
  assert.equal(run(setup('@files a.md\ngit commit -m "i"'), 'fork').error.key, 'error.noRemote');
  assert.equal(run(r.state, 'git fetch upstream').error, null);
});

test('git remote lists the online repositories (read only); fetch without a remote fails', () => {
  const s = setup(TEAM);
  const r = run(s, 'git remote -v');
  assert.equal(r.state, s);
  assert.deepEqual(r.output.remotes.map((x) => x.name), ['origin']);
  assert.equal(run(setup('@files a.md\ngit commit -m "i"'), 'git fetch').error.key, 'error.noRemote');
});

const MR = `
@files plan.md intro.md resume.md chapitres/ch1.md
git commit -m "init"
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "ventes"
@work chapitres/ch1.md
git commit -m "ch1"
@author human
git switch main
@work intro.md
git commit -m "intro"
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Charts" comments=2
@work plan.md intro.md
`;

test('@online-only: the branch exists only online, fetch brings origin/<b>, switch creates a tracking branch', () => {
  const s = setup(MR);
  assert.ok(!s.branches['ia/graphiques']);
  assert.ok(!s.remoteRefs['origin/ia/graphiques']);
  const aiTip = s.remotes.origin.branches['ia/graphiques'].tip;
  assert.ok(!s.commits[aiTip], 'AI commits are not in the local .git yet');
  assert.deepEqual(s.remotes.origin.mrs[0], { id: 42, title: 'Charts', titleKey: null, titleParams: null, source: 'ia/graphiques', target: 'main', status: 'open', comments: 2, commit: null });
  const f = run(s, 'git fetch origin');
  assert.equal(f.state.remoteRefs['origin/ia/graphiques'].tip, aiTip);
  assert.ok(f.state.commits[aiTip]);
  const w = run(f.state, 'git worktree add ../revue ia/graphiques');
  assert.equal(w.error, null);
  assert.equal(getDesk(w.state, 'revue').branch, 'ia/graphiques');
  assert.equal(w.state.branches['ia/graphiques'].upstream, 'origin/ia/graphiques');
});

test('MR: approve then merge on origin (merge commit); local main moves only with pull; unrelated M files stay', () => {
  const s = setup(MR);
  assert.equal(run(s, { name: 'mr', args: ['merge', 42] }).error.key, 'error.mrNotApproved');
  assert.equal(run(s, parseWebAction('approve MR !7')).error.key, 'error.unknownMr');
  const { state } = play(s, [parseWebAction('approve MR !42'), parseWebAction('merge MR !42')]);
  const mr = state.remotes.origin.mrs[0];
  assert.equal(mr.status, 'merged');
  const merge = state.remotes.origin.commits[mr.commit];
  assert.equal(merge.parents.length, 2);
  assert.equal(state.remotes.origin.branches.main.tip, mr.commit);
  assert.equal(state.branches.main.tip, s.branches.main.tip, 'local main does not move');
  assert.equal(state.remoteRefs['origin/main'].tip, s.branches.main.tip, 'not fetched');
  const pulled = run(state, 'git pull');
  assert.equal(pulled.error, null);
  assert.equal(pulled.state.branches.main.tip, mr.commit, 'fast-forward');
  assert.equal(status(pulled.state, 'plan.md'), 'M');
  assert.equal(status(pulled.state, 'intro.md'), 'M');
  assert.equal(run(pulled.state, parseWebAction('approve MR !42')).error.key, 'error.mrClosed');
});

test('parseWebAction reads site actions written in content', () => {
  assert.deepEqual(parseWebAction('approve MR !42').args, ['approve', 42]);
  assert.deepEqual(parseWebAction('merge MR !7').args, ['merge', 7]);
  assert.equal(parseWebAction('approve MR 42'), null);
});

test('ai: deterministic choice of 1 to 3 files, AI commit with only those files', () => {
  const s = setup(`@files plan.md intro.md resume.md chiffres.md\ngit commit -m "init"\ngit worktree add ../rpt-ia-resume -b ia/resume\n@cd rpt-client\n@work plan.md`);
  const a = run(s, { name: 'ai', args: ['rpt-ia-resume'] });
  const b = run(s, { name: 'ai', args: ['rpt-ia-resume'] });
  assert.equal(a.error, null);
  assert.deepEqual(a.output.files, b.output.files, 'deterministic');
  assert.ok(a.output.files.length >= 1 && a.output.files.length <= 3);
  const c = a.state.commits[a.output.commit];
  assert.equal(c.author, 'ai');
  assert.equal(c.msgKey, 'msg.aiWork');
  assert.deepEqual(c.files, a.output.files);
  assert.equal(a.state.branches['ia/resume'].tip, c.id);
  assert.equal(status(a.state, 'plan.md'), 'M', 'the other desk is untouched');
  const again = run(a.state, { name: 'ai', args: ['rpt-ia-resume'] });
  assert.equal(again.output.textIndex, a.output.textIndex + 1);
  const files = run(s, { name: 'ai', args: ['rpt-ia-resume'], options: { files: ['resume.md', 'annexe.md'], message: 'Résumé raccourci', commit: true } });
  assert.deepEqual(files.output.files, ['resume.md', 'annexe.md']);
  assert.equal(files.state.commits[files.output.commit].msg, 'Résumé raccourci');
  const noCommit = run(s, { name: 'ai', args: ['rpt-ia-resume'], options: { files: ['intro.md'], commit: false } });
  assert.equal(noCommit.output.commit, null);
  assert.equal(status(noCommit.state, 'intro.md', 'rpt-ia-resume'), 'M');
  assert.deepEqual(pickAiFiles(getDesk(s, 'rpt-ia-resume'), 1), pickAiFiles(getDesk(s, 'rpt-ia-resume'), 1));
});

test('assistant creates a desk on ia/<topic> and makes it work; ai-mr pushes and opens an MR', () => {
  const s = setup(TEAM);
  const r = run(s, { name: 'assistant' });
  assert.equal(r.error, null);
  const desk = r.state.worktrees.find((w) => w.branch === 'ia/resume');
  assert.equal(desk.path, 'rpt-ia-resume');
  assert.equal(r.state.commits[r.state.branches['ia/resume'].tip].author, 'ai');
  assert.equal(r.equivalent.command, 'git worktree add ../rpt-ia-resume -b ia/resume');
  const m = run(r.state, { name: 'ai-mr', args: ['rpt-ia-resume'] });
  assert.equal(m.error, null);
  const mr = m.state.remotes.origin.mrs[0];
  assert.equal(mr.source, 'ia/resume');
  assert.equal(mr.titleKey, 'mr.aiTitle');
  assert.equal(m.state.remotes.origin.branches['ia/resume'].tip, r.state.branches['ia/resume'].tip);
});

test('new remote keys exist in both dictionaries', async () => {
  const { readFileSync } = await import('node:fs');
  const en = JSON.parse(readFileSync(new URL('../../src/i18n/en.json', import.meta.url)));
  const fr = JSON.parse(readFileSync(new URL('../../src/i18n/fr.json', import.meta.url)));
  const s = setup(MR);
  const cmds = ['git fetch', 'git pull', 'git push', 'git remote', 'fork', parseWebAction('approve MR !42'), parseWebAction('merge MR !42'),
    { name: 'colleague', args: ['main'] }, { name: 'ai', args: [] }, { name: 'ai', options: { commit: false } }, { name: 'assistant' }, 'git push --force'];
  for (const c of cmds) {
    const r = apply(s, c);
    for (const k of [r.explanation && r.explanation.key, r.error && r.error.key, r.warning && r.warning.key, r.equivalent && r.equivalent.key].filter(Boolean)) {
      assert.ok(k in en, `${k} missing in en`);
      assert.ok(k in fr, `${k} missing in fr`);
    }
  }
  for (const k of ['msg.colleague', 'msg.aiWork', 'msg.mrMerge', 'mr.aiTitle']) assert.ok(k in en && k in fr, k);
});

test('glab mr: parse, create (needs the lane online, --fill pushes it), list, view, approve, merge by number or branch', async () => {
  const { parse } = await import('../../src/engine/parse.js');
  assert.deepEqual(parse('glab mr approve !42').args, ['approve', 42]);
  assert.deepEqual(parse('glab mr create -t "Résumé" -b main --fill').options, { title: 'Résumé', target: 'main', fill: true });
  assert.equal(parse('glab issue list').error.key, 'error.glabOnlyMr');
  assert.equal(parse('glab mr').error.key, 'error.glabMissingAction');
  assert.equal(parse('glab mr create --draft').error.key, 'error.glabOption');
  assert.equal(parse('glab mr aprove 4').error.params.suggestion, 'glab mr approve 4');

  let s = setup(`
@files plan.md
git commit -m "init"
@remote origin
git switch -c ia/resume
@work plan.md
git commit -am "résumé v1"
`);
  assert.equal(run(s, 'glab mr create').error.key, 'error.mrPushFirst');
  const c = run(s, 'glab mr create --fill');
  assert.equal(c.error, null);
  s = c.state;
  assert.ok(s.remotes.origin.branches['ia/resume'], '--fill pushed the lane');
  assert.deepEqual(s.remotes.origin.mrs.map((m) => [m.id, m.source, m.target, m.title, m.status]), [[1, 'ia/resume', 'main', 'résumé v1', 'open']]);
  assert.equal(run(s, 'glab mr create --fill').error.key, 'error.mrAlreadyOpen');
  assert.equal(run(s, 'glab mr list').output.mrs.length, 1);
  assert.equal(run(s, 'glab mr view').explanation.key, 'explain.mr.view.open');
  assert.equal(run(s, 'glab mr merge 1').error.key, 'error.mrNotApproved');
  s = play(s, ['glab mr approve', 'glab mr merge ia/resume']).state;
  assert.equal(s.remotes.origin.mrs[0].status, 'merged');
  assert.equal(run(s, 'glab mr close 1').error.key, 'error.mrClosed');
  assert.equal(run(s, 'glab mr approve 9').error.key, 'error.unknownMr');
});
