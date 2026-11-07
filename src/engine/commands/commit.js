// git commit -m "<msg>" | -am | --amend | --allow-empty
// Setup mode (opts.lenient): nothing staged -> saves the whole folder; empty commits allowed.
import { deskFiles, setFile, deskTree, setDeskTree, stagedPaths } from '../state.js';
import { clearConflicts } from '../conflicts.js';
import { fail, createCommit, requireResolved } from './_shared.js';

export default {
  name: 'commit',
  run(ctx) {
    const desk = ctx.desk;
    const state = ctx.state;
    const o = ctx.options;
    const op = desk.op;
    if (op && op.type === 'rebase') fail('error.useRebaseContinue', {});
    requireResolved(ctx, desk);
    if (o.a || o.all) {
      for (const f of deskFiles(desk)) {
        if (f.base !== null && f.index !== f.work) setFile(desk, f.path, { index: f.work });
      }
    }
    if (ctx.opts.lenient && !stagedPaths(desk).length) {
      for (const f of deskFiles(desk)) if (f.index !== f.work) setFile(desk, f.path, { index: f.work });
    }
    const amend = Boolean(o.amend);
    if (amend && !desk.head) fail('error.noCommitYet', {});
    const nothing = !stagedPaths(desk).length;
    if (nothing && !op && !amend && !o['allow-empty'] && !ctx.opts.lenient) fail('error.nothingToCommit', {});

    let msg = typeof o.m === 'string' ? o.m : null;
    if (o.m === true || msg === '') fail('error.commitMessageMissing', {});
    let msgKey = null;
    let msgParams = null;
    let author = null;
    const head = amend ? state.commits[desk.head] : null;
    if (msg === null) {
      if (op && op.type === 'merge') {
        msgKey = 'msg.merge';
        msgParams = { name: op.theirsLabel, into: op.oursLabel };
      } else if (op && op.type === 'cherry-pick') {
        const src = state.commits[op.source];
        msg = src.msg;
        msgKey = src.msgKey;
        msgParams = src.msgParams;
      } else if (op && op.type === 'revert') {
        const src = state.commits[op.source];
        msgKey = 'msg.revert';
        msgParams = { msg: src.msg, msgKey: src.msgKey, id: src.id };
      } else if (amend) {
        msg = head.msg;
        msgKey = head.msgKey;
        msgParams = head.msgParams;
      } else if (ctx.opts.lenient) {
        msg = '';
      } else {
        fail('error.commitMessageMissing', {});
      }
    }
    if (op && op.type === 'cherry-pick') author = state.commits[op.source].author;
    const tree = deskTree(desk, 'index');
    let parents;
    if (amend) parents = head.parents;
    else if (op && op.type === 'merge') parents = [desk.head, op.theirs];
    else parents = desk.head ? [desk.head] : [];
    const id = createCommit(ctx, desk, { tree, parents, msg: msg || '', msgKey, msgParams, author });
    clearConflicts(desk);
    setDeskTree(desk, tree, 'soft');
    if (op) {
      ctx.emit('op.finished', { desk: desk.id, op: op.type, commit: id });
      if (op.type === 'merge') ctx.emit('lanes.joined', { from: op.theirsLabel, into: op.oursLabel, commit: id });
      desk.op = null;
    }
    if (!desk.branch) ctx.warn('warn.detachedCommit', { id });
    if (amend) ctx.explain('explain.commit.amend', { branch: desk.branch || id, id, old: head.id });
    else if (op && op.type === 'merge') ctx.explain('explain.commit.merge', { name: op.theirsLabel, into: op.oursLabel, id });
    else ctx.explain('explain.commit', { branch: desk.branch || id, id });
  },
};

