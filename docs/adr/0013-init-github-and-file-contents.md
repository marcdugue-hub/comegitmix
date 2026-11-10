# 0013 — From a folder to GitHub, and real file contents

Date: 2026-11-10 · Status: Accepted · Amends: [SANDBOX §6](../SANDBOX.md) (`git init` was out of scope), [GIT-MODEL §8](../GIT-MODEL.md) (generated dummy contents)

## Context
Marc wants players to see how a project starts: a folder on their disk that becomes a Git repository, gets a first commit and is put on GitHub. Until now every scenario started inside an existing repository and `git init` was refused. He also found the simulated files empty ("plan.md · 1"): participants could not tell what a change meant in the diff screen. He asked for real text, Markdown tables and CSV files.

## Decision
- **The folder is simulated**, not read from the player's disk. A setup can start with `@no-git`: the folder has files but no `.git`. Every git command (and `glab`) then fails with "not a git repository", except `git init`; the shell, scene clicks and `gh` still work. A click only edits a file (there is no index yet).
- `git init` is a recognised command. It removes the `noGit` flag; files stay U, `main` stays unborn.
- **GitHub, both ways**:
  - `gh repo create <name> [--public|--private]` creates an empty online repository that the local repository does not know yet (`remotes.origin.pending`); `git remote add origin <url>` links it; `git push -u origin main` sends it.
  - `gh repo create [<name>] --source=. --push` creates, links and pushes in one command.
  - `git remote add` refuses an address where nothing was created (real Git would accept it and fail at the first push); the command card says so.
  - `gh` only knows `repo create`; merge requests stay with `glab`.
- **File content library**: `content/files.<lang>.md` gives each known file (and `*.md`, `*.csv`, `*.txt` defaults) a realistic initial content and a list of edits. The engine stays pure: the UI hands it the parsed library of the current language (`setFileLibrary`), content:check plays each file with its language's library, and without a library (unit tests) the generic generator is used. Edits replace prose lines in order, replace table/CSV rows by key or append them; once the list is used up, a fallback line carrying the edit number is written, so two different edits never give the same content (conflicts stay predictable). The diff screen shows CSV and Markdown tables as raw lines, like `git diff`.
- `chiffres.xlsx` becomes `chiffres.csv` in the content.

## Consequences
Mission 8 ("Your own repository", two parts), puzzles 16 to 19, the "No Git" sandbox start and the `init` and `gh` command cards are added. Switching language reloads the library; a sandbox history already played keeps the contents of the language it was played in. A sandbox start cannot carry `folder:` through "Copy as start", so the "No Git" start uses the default folder.
