// Dev-only preview of the reusable UI components. Open http://localhost:8080/dev/components.html (add ?lang=en).
import { load, setLang, getLang, t } from '../src/i18n/i18n.js';
import { createTerminal } from '../src/ui/terminal.js';
import { openPicker } from '../src/ui/pickers.js';
import { openPopover, showToast } from '../src/ui/popovers.js';
import { openRebaseEditor } from '../src/ui/rebase-editor.js';

const params = new URLSearchParams(location.search);
await load(params.get('lang') || getLang());
await setLang(params.get('lang') || getLang());

const COMMANDS = ['git status', 'git add .', 'git commit -m ""', 'git switch main', 'git switch -c ia/resume', 'git stash', 'git stash pop', 'git rebase -i HEAD~3', 'git diff --staged'];
const BRANCHES = ['main', 'ia/resume', 'ia/graphiques', 'feature/intro', 'feature/annexes', 'fix/typo', 'ia/tests', 'ia/plan'];

const term = createTerminal(document.getElementById('term'), {
  prompt: 'rpt-client (main) $',
  suggest: (text) => (text ? COMMANDS.filter((c) => c.startsWith(text) && c !== text) : COMMANDS.slice(0, 4)),
  onSubmit(text) {
    if (text === 'clear') return term.clear();
    if (text.startsWith('git status')) {
      term.print({ command: text, explanation: 'Nothing to <code>commit</code>.', output: 'On branch main\nnothing to commit, working tree clean' });
    } else if (text.startsWith('git ')) {
      term.print({ command: text, warning: t('rebase.errorSquashFirst'), explanation: 'Simulated.' });
    } else {
      term.print({ command: text, error: t('picker.empty') });
    }
  },
});
term.print({ command: 'git status', explanation: 'Your folder matches the last commit.', output: 'On branch main\nnothing to commit' });

const bar = document.getElementById('bar');
const buttons = document.getElementById('buttons');
function btn(parent, label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn btn--small';
  b.type = 'button';
  b.textContent = label; // i18n-ok (dev page)
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}
btn(bar, 'FR', () => setLang('fr').then(() => location.reload()));
btn(bar, 'EN', () => setLang('en').then(() => location.reload()));
let details = false;
btn(bar, 'details', () => { details = !details; term.setDetails(details); });
btn(bar, 'disable', () => term.setDisabled(!document.querySelector('.terminal.is-disabled')));
btn(bar, 'setValue', () => { term.setValue('git switch '); term.focus(); });

btn(buttons, 'picker (8)', (e) => openPicker(e.currentTarget, { title: 'Branch', options: BRANCHES.map((b) => ({ value: b, label: b, hint: b === 'main' ? 'current' : undefined })), onPick: (v) => showToast(v, { kind: 'ok' }) }));
btn(buttons, 'picker (3)', (e) => openPicker(e.currentTarget, { title: 'Desk', options: BRANCHES.slice(0, 3).map((b) => ({ value: b, label: b })), onPick: (v) => showToast(v) }));
btn(buttons, 'popover', (e) => openPopover(e.currentTarget, {
  title: 'ia/resume',
  items: [
    { label: 'Open here', icon: 'git-branch', onSelect: () => showToast('switch') },
    { label: 'Merge', icon: 'git-merge', onSelect: () => showToast('merge', { kind: 'ok' }) },
    { label: 'Delete', icon: 'x', disabled: true, onSelect: () => {} },
  ],
}));
btn(buttons, 'popover (body)', (e) => openPopover(e.currentTarget, { title: 'MR !42', body: 'Adds <strong>charts</strong>.' }));
btn(buttons, 'toast info', () => showToast('Info message'));
btn(buttons, 'toast ok', () => showToast('Done', { kind: 'ok' }));
btn(buttons, 'toast error', () => showToast('Something failed', { kind: 'error' }));
btn(buttons, 'rebase editor', () => {
  openRebaseEditor(document.getElementById('rebase'), {
    commits: [
      { id: 'c4', message: 'wip graphs', author: 'ai' },
      { id: 'c5', message: 'wip graphs 2', author: 'ai' },
      { id: 'c6', message: 'fix legend', author: 'human' },
    ],
    onConfirm: (plan) => { showToast(JSON.stringify(plan), { kind: 'ok', timeout: 8000 }); window.__plan = plan; },
    onCancel: () => showToast('cancel'),
  });
});
