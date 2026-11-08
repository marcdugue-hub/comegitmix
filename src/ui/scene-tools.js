// Scene helpers shared by the sandbox and the mission screen: the popovers of the scene (commit circle, lane chip,
// merge request card, stash chip) and the "More details" list (raw output of a command, mapped to the scene).
// The caller owns the state and the way commands are played; these helpers only build menus and markup.
import { t } from '../i18n/i18n.js';
import { activeDesk, getDesk, isAncestor } from '../engine/state.js';
import { commitText, esc } from '../render/screens-util.js';
import { icon } from './icons.js';
import { openPopover, showToast } from './popovers.js';
import { deskFolderFor, outputLines } from './sandbox-model.js';

/**
 * Popovers of the scene.
 * deps: { getState: () => state, run: (command text | object) => void, activate?: (deskId) => void }
 * Returns { commit(id, anchor), branch(name, remote, anchor), mr(id, anchor), stash(anchor) }.
 */
export function createScenePopovers({ getState, run, activate = () => {} }) {
  function commit(id, anchor) {
    const s = getState();
    const c = s.commits[id];
    if (!c) return;
    const desk = activeDesk(s);
    const inHead = desk.head ? isAncestor(s, id, desk.head) : false;
    const body = `<p class="sb-pop-meta">${icon(c.author === 'ai' ? 'star' : 'users', { size: 14 })} ${esc(t(c.author === 'ai' ? 'log.author.ai' : 'log.author.human'))} · <span class="mono">${esc(id)}</span></p>` +
      `<p class="sb-pop-files mono">${esc((c.files || []).join(', '))}</p>`;
    openPopover(anchor, {
      title: commitText(c),
      body,
      items: [
        { label: t('sandbox.commit.diff'), icon: 'diff', onSelect: () => run(`git show ${id}`) },
        { label: t('sandbox.commit.cherryPick'), icon: 'cherry', disabled: inHead, onSelect: () => run(`git cherry-pick ${id}`) },
        { label: t('sandbox.commit.reset'), icon: 'rotate-ccw', disabled: !inHead || id === desk.head, onSelect: () => run(`git reset ${id}`) },
        { label: t('sandbox.commit.revert'), icon: 'history', disabled: !inHead || c.parents.length !== 1, onSelect: () => run(`git revert ${id}`) },
        { label: t('sandbox.commit.newDesk'), icon: 'folder-plus', onSelect: () => run(`git worktree add ../${deskFolderFor(s, id)} ${id}`) },
      ],
    });
  }

  function branch(name, remote, anchor) {
    const s = getState();
    const desk = activeDesk(s);
    const local = remote ? name.replace(/^[^/]+\//, '') : name;
    const current = !remote && desk.branch === name;
    const onDesk = s.worktrees.some((w) => w.branch === local);
    const from = desk.branch || 'HEAD';
    const items = [
      { label: t('sandbox.branch.switch'), icon: 'arrow-right-left', disabled: current, onSelect: () => run(`git switch ${local}`) },
      { label: t('sandbox.branch.merge', { into: from }), icon: 'git-merge', disabled: current, onSelect: () => run(`git merge ${name}`) },
      { label: t('sandbox.branch.rebase', { name }), icon: 'move-horizontal', disabled: current, onSelect: () => run(`git rebase ${name}`) },
      { label: t('sandbox.branch.compare'), icon: 'diff', disabled: current, onSelect: () => run(`git diff ${from} ${name}`) },
    ];
    if (!remote) {
      items.push({ label: t('sandbox.branch.newDesk'), icon: 'folder-plus', disabled: onDesk, onSelect: () => run(`git worktree add ../${deskFolderFor(s, name)} ${name}`) });
      items.push({ label: t('sandbox.branch.delete'), icon: 'x', disabled: onDesk, onSelect: () => run(`git branch -d ${name}`) });
    }
    openPopover(anchor, { title: name, items });
  }

  function mr(id, anchor) {
    const s = getState();
    let found = null;
    for (const r of Object.values(s.remotes || {})) found = found || (r.mrs || []).find((m) => m.id === id);
    if (!found) return;
    const ref = (b) => (s.remoteRefs && s.remoteRefs[`origin/${b}`] ? `origin/${b}` : s.branches[b] ? b : null);
    openPopover(anchor, {
      title: `!${found.id} · ${found.titleKey ? t(found.titleKey, found.titleParams || {}) : found.title}`,
      body: `<p class="sb-pop-meta">${esc(t(`mr.status.${found.status}`))} · <span class="mono">${esc(found.source)} → ${esc(found.target)}</span></p>`,
      items: [
        { label: t('sandbox.mr.approve'), icon: 'badge-check', disabled: found.status !== 'open', onSelect: () => run(`glab mr approve ${found.id}`) },
        { label: t('sandbox.mr.merge'), icon: 'git-pull-request-arrow', disabled: found.status !== 'approved', onSelect: () => run(`glab mr merge ${found.id}`) },
        {
          label: t('sandbox.mr.diff'), icon: 'diff', disabled: found.status === 'merged',
          onSelect: () => {
            const a = ref(found.target);
            const b = ref(found.source);
            // what the MR brings since it left its target, as a review page shows it
            if (a && b) run(`git diff ${a}...${b}`);
            else showToast(t('sandbox.mr.fetchFirst'), { kind: 'info' });
          },
        },
      ],
    });
  }

  /** The repository's stash: shared by every desk, so pop / apply act on the active desk. */
  function stash(anchor) {
    const n = (getState().stash || []).length;
    const go = (cmd) => () => run(cmd);
    openPopover(anchor, {
      title: t('stash.popTitle', { n }),
      items: [
        { label: t('sandbox.stash.pop'), icon: 'archive', disabled: !n, onSelect: go('git stash pop') },
        { label: t('sandbox.stash.apply'), icon: 'archive', disabled: !n, onSelect: go('git stash apply') },
        { label: t('sandbox.stash.drop'), icon: 'x', disabled: !n, onSelect: go('git stash drop') },
        { label: t('sandbox.stash.list'), icon: 'list-checks', onSelect: go('git stash list') },
      ],
    });
  }

  return { commit, branch, mr, stash };
}

/**
 * Handles the popover actions of a scene `onAction` callback. Returns true when the action was a popover.
 */
export function handlePopoverAction(popovers, a) {
  switch (a.type) {
    case 'commit': popovers.commit(a.id, a.anchor); return true;
    case 'branch': popovers.branch(a.name, a.remote, a.anchor); return true;
    case 'mr': popovers.mr(a.id, a.anchor); return true;
    case 'stash': popovers.stash(a.anchor); return true;
    default: return false;
  }
}

/** Raw output lines of a command result ({ output, state }): [{ text, hl? }]. */
export function detailLines(result) {
  return result && result.output ? outputLines(result.output, result.state) : [];
}

/** Markup of the "More details" list items. Mapped lines carry their scene highlight as JSON. Pure. */
export function detailsItemsHtml(lines) {
  return lines.map((l) => (l.hl
    ? `<li class="mono is-mapped" data-hl="${esc(JSON.stringify(l.hl))}">${esc(l.text)}</li>`
    : `<li class="mono">${esc(l.text)}</li>`)).join('');
}

/** Hovering a mapped line of `list` highlights its scene element (setHighlight(hl | null)). Returns an unbind function. */
export function bindDetailsHover(list, setHighlight) {
  const over = (e) => {
    const li = e.target && e.target.closest ? e.target.closest('li[data-hl]') : null;
    if (!li || !list.contains(li)) return;
    try {
      setHighlight(JSON.parse(li.getAttribute('data-hl')));
    } catch {
      setHighlight(null);
    }
  };
  const out = (e) => {
    const li = e.target && e.target.closest ? e.target.closest('li[data-hl]') : null;
    if (li && !(e.relatedTarget && li.contains(e.relatedTarget))) setHighlight(null);
  };
  list.addEventListener('mouseover', over);
  list.addEventListener('mouseout', out);
  return () => {
    list.removeEventListener('mouseover', over);
    list.removeEventListener('mouseout', out);
  };
}
