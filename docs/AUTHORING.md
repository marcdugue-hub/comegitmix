# AUTHORING — writing missions, puzzles and sandbox starts in Markdown

Goal: Marc must be able to **create and change content without touching the code**. Every mission, every puzzle and every sandbox starting point is a `.md` file that any text editor can open. The game reads these files at startup and interprets them.

**All structural tokens are in English, in both the French and the English files**: front-matter keys and values, section headings, step keys, directives, check phrases, error codes, site actions, table-of-contents sections. There are **no aliases**: a French token (`titre:`, `## Départ`, `@travail`…) is an error. Only **displayed text** (titles, explanations, bubbles, commit messages, file contents shown in a conflict) is written in the file's language.

Content changes go through commits / merge requests on GitHub. There is no in-game editor and no author mode; `npm run content:check` (§8) is the only validator.

## 1. Where the files are

```
content/
  index.md                          order and activation of all content
  ai-work.fr.md                     generic "what the AI did" texts, French (§7)
  ai-work.en.md                     the same, English
  missions/06-relire-une-mr.fr.md   a mission, in French
  missions/06-relire-une-mr.en.md   the same, in English
  puzzles/04-trois-wip-en-un.fr.md
  sandbox/deux-ia.fr.md             a sandbox starting point
```

- **One file per language**: `<name>.fr.md` and `<name>.en.md`. Same structure, same steps in the same order. If the English file is missing, the game shows the French one with a small "FR" badge (no blocking error). French is the fallback language.
- The file name without the language suffix is the content **id** (`06-relire-une-mr`). Ids are French slugs; they are identifiers, not displayed text, and do not change between languages.
- Files are served as-is and loaded with `fetch` (the game runs on static hosting). No build step.

## 2. The table of contents (`content/index.md`)

It sets the order and what is active. Removing a line deactivates a piece of content; moving a line reorders it.

```md
# Missions
- 01-premiere-photo
- 02-une-voie-pour-l-ia
- 03-deux-assistants
<!-- a commented-out line is ignored -->

# Puzzles
- 01-ranger-un-fichier
- 04-trois-wip-en-un

# Sandbox
- vide
- deux-ia
```

Recognised section titles (exactly): `Missions`, `Puzzles`, `Sandbox`. The order in `Missions` gives the displayed numbering ("Mission 3 of 7") and the recommended order (all missions are unlocked; nothing is locked). A `mode: compare` file listed under `Missions` does not count in the numbering (§4.5).

## 3. Common blocks

### 3.1 Front matter
Between two `---` lines, `key: value` pairs (a simple subset of YAML: text, number, list `[a, b]`).

| Key | Meaning |
|---|---|
| `title` | displayed title (in the file's language) |
| `duration` | minutes (missions) |
| `repos` | repositories visible in zone ①: `local`, `origin`, `upstream` |
| `unlocks` | commands unlocked **by** this mission (ids from `data/commands.json`) |
| `folder` | name of the original folder (default `rpt-client`) |
| `mode` | missions: `guided` (default), `stepper` (§4.4) or `compare` (§4.5) |
| `type` | puzzles: `choice` (default) or `typed` |
| `timer` | puzzles: seconds, optional |

Any other key is an error.

### 3.2 The setup block ` ```git-setup `
It describes the **starting state** by replaying commands, as if someone had typed them before the player arrived. It contains **real Git commands** and a few **directives** (prefix `@`) for what Git cannot do on its own (create files, simulate an AI's work, an online repository, an MR).

````md
## Setup
```git-setup
@files plan.md intro.md resume.md chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "résumé v1"
@author human
git switch main
git worktree add ../rpt-ia-resume ia/resume
@work plan.md intro.md
@cd rpt-client
```
````

Rules of the setup mode (more lenient than the game):
- A repository is created automatically in the `folder:` folder (no `git init` needed).
- `git commit` with nothing staged saves all modified files (like `-a`), and accepts an empty commit.
- Commit messages are content: write them in the file's language. Branch names, folder names and file paths are identifiers: keep them identical in both languages (check phrases refer to them).
- Keep folder names short: **14 characters at most**, or the desk tile cuts them with "…". Abbreviate "rapport" as `rpt` (`rpt-client`, `rpt-ia-resume`). `content:check` warns about longer `worktree add` folders.
- A line starting with `#` is a comment.
- An error (unknown branch, etc.) is reported with the file and line number.

Directives:

| Directive | Effect |
|---|---|
| `@files <paths…>` | creates clean files in the active desk (folders are inferred from the paths) |
| `@work <paths…>` | "I worked on it": the files become **M** (generated modified content) |
| `@new <paths…>` | creates **U** files (untracked) |
| `@content <path>` followed by an indented block | sets the exact content of a file (useful for a readable diff) |
| `@author ai` / `@author human` | author of the following commits (AI commits are marked) |
| `@cd <folder>` | changes the active desk |
| `@remote origin` | creates (or updates) the online repository `origin` with the current state of every branch (like pushing everything) |
| `@remote upstream` then `@fork upstream origin` | creates the original project and your fork |
| `@online-only <branch>` | the branch now exists only online (pushed, then deleted locally) |
| `@colleague <branch> "<message>" [files=<paths>]` | a colleague pushes a commit to `origin/<branch>` (not fetched yet). Without `files=`, the commit changes a file that was not changed locally since the common base, so a later `pull` never conflicts; with `files=`, it changes those paths (which can produce a conflict, §3.4) |
| `@mr <num> <source> -> <target> "<title>" [comments=<n>]` | opens a merge request on `origin` |
| `@rebase-plan pick,squash,drop,…` | plan of the next interactive rebase (§4.2) |

Any other directive is an error.

### 3.3 Free text
Anything that is not a recognised key is **displayed text**. Limited Markdown: paragraphs, **bold**, *italics*, `code`, links, lists. No HTML (escaped).

Bubble of the duo (the human/screen guide): a quote that starts with `duo:`.
```md
> duo: An AI assistant opened MR !42. Let's review it without disturbing your desk.
```

### 3.4 Conflicts and the ` ```conflict ` block
**Rule (fixed, not configurable)**: when a `merge`, `rebase`, `pull` or `cherry-pick` brings together two sides that **both changed the same file** since their common base, that file is in conflict. There are no line-level conflicts: the simulation does not compare lines. The file takes the `conflict` status in zone ④ and the operation stops until every conflicted file is resolved.

A mission, puzzle or sandbox start can describe what the two versions of a conflicted file look like with a `conflict` block, one block per file:

````md
```conflict plan.md
<<< main
Delivery in March
=== ia/resume
Delivery in April
>>>
```
````

Syntax:
- The info string is `conflict <path>`, the path relative to the desk folder (`chapitres/ch1.md`).
- `<<< <branch>` opens the first side: the lane you are on (the one receiving the merge). The lines that follow, up to `===`, are its version.
- `=== <branch>` opens the second side: the incoming lane. The lines that follow, up to `>>>`, are its version.
- `>>>` closes the block. Both versions are displayed text, written in the file's language; a side may be empty (one empty line).
- Place the blocks in the `## Setup` section, after the `git-setup` block (or in a part's `### Setup`, §4.3). They apply to the whole file (or part).

Behaviour in the game:
- **With a block**: when that path is in conflict between those two branches, clicking "diff" on the file (or a step with `opens: conflict`) opens the diff screen on the conflict. It shows both versions side by side, labelled with the branch names, and offers three resolutions: **keep `<first branch>`**, **keep `<second branch>`**, **keep both** (first then second). Choosing writes the result into the file, which leaves the `conflict` status and becomes **M**; as in real Git, the player then runs `git add <path>` and `git commit` (or `git rebase --continue`) to finish.
- **Without a block** (or for a conflict between other branches than those of the block): clicking "diff" on the conflicted file shows the message (UI text `diff.conflict.noDetail` in `src/i18n/*.json`): "This scenario does not detail the content; in a real project Git would show you the conflicting lines." This is a limit of the scenario, not of Git. Resolution then goes through the same three choices, without showing content.
- **Sandbox**: conflicts the player creates during free play always use the message. A sandbox start may carry a block only for the conflict it prepares (same path, same two branches), as `content/sandbox/conflit.*.md` does.

## 4. Mission format

````md
---
title: Relire une MR
duration: 12
repos: [local, origin]
unlocks: [stash, worktree-remove, mr-approve, mr-merge]
mode: stepper
---

> duo: Un assistant IA a ouvert la MR !42 sur sa branche ia/graphiques. Vous êtes en plein travail.

## Setup
```git-setup
…
```

## Steps

### 1. Regarder son travail en cours
command: git status
Avant de changer de branche, on regarde ce qui est en cours.
after: Deux fichiers modifiés (M) : votre travail n'est pas encore enregistré.

### 2. Ranger son travail
command: git stash
accepts: git stash push
On met le travail de côté pour pouvoir changer de branche sans le perdre.
after: Vos M ont disparu du dossier : ils sont rangés dans le stash.
note: Votre travail est caché, pas perdu.
hint: La commande pour « mettre de côté » commence par git st…

## End
summary: Ça marche, mais votre bureau a été dérangé pendant toute la revue.
takeaway: Changer de branche change le contenu de votre dossier.
next: puzzle 12-relire-sans-deranger
````

Sections of a mission: `## Setup`, `## Steps` (or `## Part …`, §4.3), `## End`. Any other `##` heading is an error (except in a `mode: compare` file, §4.5).

### 4.1 A step (`### n. Title`)
Possible keys, one per line (`key: value`); the first paragraph without a key is the **explanation**. The title after `n.` is displayed text.

| Key | Meaning |
|---|---|
| `command` | the expected command (shown on the "Your next command" card). In parentheses, it is an **interface instruction**, not a command (`(cliquez plan.md dans votre dossier)`, `(bouton « Faire travailler l'IA »)`): `check:` is then mandatory. Commands of the simulated shell (`fork`, `cd`) are accepted |
| `web` | instead of `command`: an action on GitLab/GitHub, shown without `$`. Values: `approve MR !<n>`, `merge MR !<n>`; several actions separated by ` ; ` (`web: approve MR !42 ; merge MR !42`). The button label shown to the player comes from `src/i18n/*.json` |
| `accepts` | other accepted spellings, separated by `;` (`git checkout main ; git switch main`). `*` stands for any text (`git commit -m "*"`) |
| `after` | "What just happened" text, shown after the command runs |
| `note` | handwritten annotation (Caveat) placed on the scene |
| `hint` | text of the Hint button |
| `opens` | `diff` (opens the diff screen), `log`, `conflict` (opens the diff screen on the conflicted file, §3.4) |
| `diff-mode` | mode of the diff screen: `branches` (between two lanes), `work` (my changes), `staged` |
| `check` | success conditions (§4.2). Default: the expected command (or an accepted one) succeeded |
| `before` | `git-setup` lines (directives or commands) played just before the step, on the same line or as a list (`- @colleague main "correction"`) |
| `ai-files` | paths the "Make the AI work" button changes during this step (default: 1 to 3 files picked from the desk, §7) |
| `ai-text` | text shown when the AI works during this step, instead of a generic text from `content/ai-work.*.md` (§7) |

A line that starts with a lowercase word (letters and `-`) immediately followed by `: ` is read as a key; if the key is not in this table, the checker reports an error. Displayed text must not start that way (French typography puts a space before `:`, so this rarely matters).

### 4.2 Success conditions (`check:`)
On the same line, or as a list below. All of them must be true.

```md
check:
- desk revue-mr-42 on ia/graphiques
- work-intact rpt-client
```

| Phrase | True when |
|---|---|
| `command <id>` | the last successful command is `<id>` (ids from `data/commands.json`) |
| `branch <name> exists` | the branch exists locally |
| `<a> = <b>` | both branches point to the same commit (`main = origin/main`) |
| `desk <folder> on <branch>` | the folder exists and has this branch open |
| `desk <folder> removed` | the folder no longer exists |
| `active desk <folder>` | it is the active desk |
| `work-intact <folder>` | the M/U files present at setup are still there, unchanged |
| `file <folder>/<path> <status>` | status `M`, `U`, `A`, `staged`, `clean`, `conflict` |
| `resolved <folder>/<path> <side>` | the conflict on this file was resolved by keeping `<side>`: a branch name from the `conflict` block, or `both` |
| `index <folder> empty` / `index <folder> contains <path>` | state of the desk's index |
| `stash <folder> = <n>` | number of entries in the stash |
| `commits <branch> since <base> = <n>` | number of commits that belong only to the branch |
| `remote <branch> fetched` | `origin/<branch>` exists locally |
| `mr <num> <status>` | `open`, `approved`, `merged` |
| `diff shown <mode>` | the diff screen was opened in this mode (`branches`, `work`, `staged`) |
| `no conflict` | no file is in conflict any more |
| `error <code>` | the last command failed with this error (for steps where the player **must** see Git refuse). Codes: `push-rejected`, `branch-in-use`, `worktree-dirty`, `nothing-to-commit`, `conflict` (matching the i18n keys `error.pushRejected`, `error.branchInUse`, `error.worktreeDirty`, `error.nothingToCommit`, `error.mergeConflict`) |

An unknown phrase is a content error (reported by the checker, §8).

Interactive rebase played automatically (puzzle goal, setup, step validated by default): default plan "keep the first commit, fold the following ones into it" (squash). The directive `@rebase-plan pick,squash,drop,…` (in `before:` or in the setup) imposes another plan. In the game, the rebase editor opens pre-filled with this plan.

### 4.3 Parts (two-part missions)
Instead of `## Steps`, a mission can contain several `## Part <letter> — <title>` sections (each with its own `### steps`, and optionally its own setup via `### Setup` inside the part, before the first step). The panel shows a part selector. Without `### Setup`, a part restarts from the mission's `## Setup`. A `### Part end` heading followed by `summary:` ends the part (green card and a link to the next part). `Part` and the letter are tokens; the title after ` — ` is displayed text.

```md
## Part A — Sur une branche
> duo: Relisons la MR de la façon classique.
### 1. Regarder son travail en cours
…
### Part end
summary: Ça marche, mais votre bureau a été dérangé.
## Part B — Dans un worktree
…
```

### 4.4 Modes
- `guided`: the player must succeed at a step to move to the next one (command clicked or typed).
- `stepper`: in addition, clickable steps and a Previous button; the scene is **recomputed** from the setup plus the steps done so far (see mockups A5/A6).

### 4.5 End and comparison screens
`## End`: `summary:`, `takeaway:`, `next:` (`mission <id>`, `puzzle <id>`, `sandbox <id>`, or `compare <id>` for a dedicated comparison screen).

A comparison screen like A7 is described in a separate file with `mode: compare` (see `content/missions/06b-deux-facons.fr.md`):
- `## Column — <title>` with `replays: <mission> part <letter>` (step titles and commands are taken from that part) and `desk:` (one value per step: `intact`, `stashed`, `changed`, `restored`, `removed`, shown as coloured chips whose labels come from `src/i18n/*.json`). The number of values must equal the number of steps of the replayed part;
- every other `## section` is a text box whose heading is displayed text (a line alone between backticks = an error message shown in a monospace font).

A `mode: compare` file does not count in the mission numbering; the player reaches it only through `next: compare <id>`.

## 5. Puzzle format

````md
---
title: Trois « wip » en un
type: choice
timer: 60
repos: [local]
---

## Prompt
L'IA a laissé trois commits « wip ». Fusionnez-les en un seul avant de partager.

## Setup
```git-setup
@files rapport.md
git commit -m "Premier jet"
@author ai
git switch -c ia/chiffres
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
```

## Choices
- [x] git rebase -i HEAD~3
- [ ] git reset --hard HEAD~3 — reset --hard efface le travail au lieu de le regrouper.
- [ ] git revert HEAD~3 — revert ajoute un commit d'annulation, il ne regroupe rien.
- [ ] git merge main — merge intègre une autre voie, il ne nettoie pas celle-ci.

## Goal
Un seul commit propre sur la voie ia/chiffres.

## Takeaway
rebase -i permet de regrouper (squash) plusieurs commits en un avant de partager.
````

Sections of a puzzle: `## Prompt`, `## Setup`, `## Choices` (type `choice`) or `## Solution` (type `typed`), `## Goal`, `## Takeaway`.

- **The goal state is computed**: it is the state obtained by applying the ticked `[x]` choice to the setup. It is shown with a dotted sky outline. `## Goal` is only the sentence that goes with it.
- Text after ` — `: explanation shown if the player picks that wrong answer. Exactly one choice is ticked.
- `type: typed`: no `## Choices`; the player types a command; success if the resulting state is **equivalent** to the one produced by `solution:` (shape comparison: branches, number of commits, files, ignoring ids). A `check:` list can also be given, as for a step.
  ```md
  ## Solution
  solution: git worktree add ../revue ia/graphiques
  check:
  - desk revue on ia/graphiques
  ```
- Stars: 3 on the first try, 2 on the second, 1 after that (can be tuned later).

## 6. Sandbox start format

````md
---
title: Deux assistants IA
repos: [local]
---
Votre dossier et deux bureaux d'assistants IA, chacun sur sa voie.

## Setup
```git-setup
…
```
````
The text is shown in the start picker. A start may add `conflict` blocks after the `git-setup` block (§3.4). Starts must stay within the sandbox limits (8 branches, 4 desks, about 40 commits; see `docs/SANDBOX.md`).

**Make a start from the sandbox**: the "Copy as setup" button copies to the clipboard the ` ```git-setup ` block matching the current history (to paste into a mission, puzzle or start file). It does not edit any content file.

## 7. What the AI did (`content/ai-work.fr.md`, `content/ai-work.en.md`)

The "Make the AI work" button changes 1 to 3 files of the desk (or the paths given by the step's `ai-files:`), then shows a short text saying what the AI did. Unless the step provides `ai-text:`, the text is picked at random from the generic list in `content/ai-work.<lang>.md` (French fallback, like other content):

```md
# What the AI did

- The AI rewrote a few sentences in {files} to make them shorter.
- The AI filled in the missing information in {files}.
```

- The `#` heading is ignored; each `- ` list item is one text. Other lines are ignored.
- `{files}` is replaced by the names of the changed files, joined in the UI language ("plan.md and intro.md"). It is optional.
- The list must contain at least one item; the two language files need not have the same number of items.
- The same text is used as the message of the AI's commit when the button also commits.

## 7 bis. Command cards (`content/docs/<id>.fr.md`, `content/docs/<id>.en.md`)

The **Documentation** button of the header opens, in a new tab, one card per command written for non-developers; after an error, the terminal links to the card of the typed command (or to the list). The list of cards, their groups, the words that lead to them (`squash` → `rebase`, `ls` → `cd`…) and their official page (git-scm.com in the UI language, GitHub docs for `fork` and `mr`) are in `src/content/docs-topics.js`.

```md
---
title: git merge
summary: Bring the work of another lane into yours.
syntax: git merge <branch>
see: [rebase, switch, mr]
---

## What it does
Plain words, real Git behaviour.

## In the game
What the four zones show. Only what the game really does.

## Example
- `git switch main`: ...

## Watch out
The trap to avoid.
```

- `title`, `summary`, `syntax` are required; `see:` lists other card ids.
- Sections: `## What it does` and `## In the game` are required, `## Example` and `## Watch out` optional; the headings shown come from i18n (`docs.section.*`). Bodies use the mini-Markdown of §3 (paragraphs, lists, bold, italic, code).
- The French and English cards have the same sections and the same `see:` list.

## 8. Checking content
`npm run content:check` reads `index.md`, `ai-work.*.md` and every listed file, and reports errors **with file and line**: unknown key, section or directive (including any French token), unrecognised command, unknown `check` phrase or error code, FR/EN steps or parts not aligned (same count, same order, same `command`/`web`/`check`), `conflict` block malformed or referring to a path or branch that the setup does not create, `desk:` values not matching the replayed part, a choice list without exactly one `[x]`, a setup that fails, a solution that does not reach the goal, an id listed in `index.md` with no `.fr.md` file, a command card missing in one language or not aligned between FR and EN. A missing `.en.md` is a warning, not an error. The command exits with a non-zero code when there is at least one error.

## 9. What stays in the code
Interface texts (buttons, zones, Git errors, generic command explanations, the conflict fallback message, labels of `desk:` chips and `web:` actions) stay in `src/i18n/*.json`. All **narrative** text (missions, puzzles, sandbox starts, generic AI texts) lives in `content/`. The `mission.*` and `puzzle.*` keys present today in `src/i18n/*.json` only serve as a source for writing the `.md` files; they will be removed during implementation.
