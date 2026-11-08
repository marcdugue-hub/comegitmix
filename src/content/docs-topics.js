// Command cards (content/docs/<id>.<lang>.md): their order, their groups and their official page.
// Pure data + helpers, shared by the docs screen, the terminal links and content:check.
import { closest } from '../engine/parse.js';

const GIT_SCM = { fr: 'https://git-scm.com/docs/git-{name}/fr', en: 'https://git-scm.com/docs/git-{name}' };
const GITHUB = 'https://docs.github.com/{lang}/pull-requests/collaborating-with-pull-requests/';

/** Groups in display order; `label` is an i18n key. */
export const DOC_GROUPS = [
  { id: 'prepare', label: 'group.prepare', topics: ['status', 'add', 'commit', 'restore', 'rm', 'stash'] },
  { id: 'lanes', label: 'group.lanes', topics: ['branch', 'switch', 'checkout', 'merge', 'rebase'] },
  { id: 'rewrite', label: 'group.rewrite', topics: ['cherry-pick', 'reset', 'revert'] },
  { id: 'share', label: 'group.share', topics: ['fork', 'fetch', 'pull', 'push', 'remote', 'mr'] },
  { id: 'parallel', label: 'group.parallel', topics: ['worktree', 'cd'] },
  { id: 'read', label: 'group.read', topics: ['diff', 'log', 'blame', 'show'] },
];

export const DOC_TOPICS = DOC_GROUPS.flatMap((g) => g.topics);

/** Official pages that are not git-scm.com/docs/git-<id>; null = no official page. */
const OFFICIAL = {
  fork: { fr: `${GITHUB.replace('{lang}', 'fr')}working-with-forks/fork-a-repo`, en: `${GITHUB.replace('{lang}', 'en')}working-with-forks/fork-a-repo` },
  mr: {
    fr: `${GITHUB.replace('{lang}', 'fr')}proposing-changes-to-your-work-with-pull-requests/about-pull-requests`,
    en: `${GITHUB.replace('{lang}', 'en')}proposing-changes-to-your-work-with-pull-requests/about-pull-requests`,
  },
  cd: null,
};

/** Words typed in the terminal (or palette ids) that lead to another card. */
const ALIASES = {
  squash: 'rebase', 'worktree-add': 'worktree', 'worktree-list': 'worktree', 'worktree-remove': 'worktree',
  ls: 'cd', 'mr-approve': 'mr', 'mr-merge': 'mr', approve: 'mr', close: 'mr', open: 'mr',
};

/** The official documentation page of a card, in `lang` when it exists (else English), or null. */
export function officialUrl(id, lang = 'en') {
  if (id in OFFICIAL) {
    const o = OFFICIAL[id];
    return o ? o[lang] || o.en : null;
  }
  if (!DOC_TOPICS.includes(id)) return null;
  return (GIT_SCM[lang] || GIT_SCM.en).replace('{name}', id);
}

/** The card id for a typed command ("git merge x", "git rebase -i HEAD~3", "approve MR !42", "git mrege"), or null. */
export function docTopicFor(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).map((w) => w.toLowerCase());
  if (!words.length) return null;
  let word = words[0] === 'git' ? words[1] : words[0];
  if (!word) return null;
  if (words[0] !== 'git' && words[1] === 'mr') word = 'mr';
  if (word === 'help' || word === '?') word = words[words[0] === 'git' ? 2 : 1];
  if (!word) return null;
  const id = ALIASES[word] || word;
  if (DOC_TOPICS.includes(id)) return id;
  const near = closest(word, [...DOC_TOPICS, ...Object.keys(ALIASES)]); // a typo: the card of the suggestion
  return near ? ALIASES[near] || near : null;
}

/** Hash of the docs screen: the list, or one card. */
export function docHash(id = null) {
  return id ? `#/docs/${id}` : '#/docs';
}
