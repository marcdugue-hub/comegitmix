---
title: A readable history
duration: 14
repos: [local, origin]
unlocks: [rebase, squash, cherry-pick]
---

> duo: The assistant left a messy history: “wip” commits, a branch that started from an old version, a useful fix lost somewhere else. Let's tidy it all up before sharing.

## Setup
```git-setup
@files plan.md intro.md resume.md chiffres.md
git commit -m "init"
@author ai
git switch -c ia/chiffres
@work chiffres.md
git commit -m "wip"
@work chiffres.md
git commit -m "wip"
@work chiffres.md
git commit -m "wip"
git switch main
git switch -c ia/essai
@work resume.md
git commit -m "typo fixed in the summary"
@work intro.md
git commit -m "abandoned attempt"
@author human
git switch main
@work plan.md
git commit -m "outline revised"
@remote origin
git switch ia/chiffres
```

## Steps

### 1. Fold the “wip” commits together
command: git rebase -i HEAD~3
check: commits ia/chiffres since main = 1
Interactive rebase lists the last 3 commits: keep the first one (pick) and fold the other two into it (squash).
after: Three dots melted into one. Same content, easier history to read.
note: Same work, less noise

### 2. Restart from the latest version of main
command: git rebase main
The assistant's lane started from an old version. Rebase makes it restart from the latest commit on main.
after: The ia/chiffres lane now starts from the tip of main: no more lag.

### 3. Pick up a single useful commit
before: @cd rapport-client
command: git switch main
after: You are on main.

### 4. Take the fix, not the attempt
command: git cherry-pick ia/essai~1
accepts: git cherry-pick *
cherry-pick copies a single commit from another lane onto yours.
after: The summary fix is copied onto main. The abandoned attempt stays on its lane.

### 5. Set work in progress aside
before: @work intro.md
command: git stash
after: intro.md is put away in the stash: your folder is clean.

### 6. Put away a finished desk
before:
- git worktree add ../rapport-ia-essai ia/essai
command: git worktree remove ../rapport-ia-essai
The attempt's desk is no longer needed: remove the folder. The branch stays in the .git.
after: The tile disappeared; the ia/essai lane is still there.

## End
summary: A short, clear history is easier to review, for you and for the team.
takeaway: squash folds together, rebase restarts, cherry-pick copies a single commit. Never rewrite a history that is already shared.
next: sandbox deux-ia
