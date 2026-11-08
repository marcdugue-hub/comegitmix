---
title: A readable history
duration: 14
repos: [local, origin]
unlocks: [rebase, squash, cherry-pick, mr-create]
---

> duo: Friday, 3 p.m. Before the report goes to Maison Pivert, a little tidying up. The “figures” assistant left three “wip” commits (work in progress), its lane starts from an old version, and a useful fix is lying around on a trial branch.

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
after: Three dots melted into one. Same content, and a history you can finally read.
note: Same work, less noise

### 2. Restart from the latest version of main
command: git rebase main
The assistant's lane started from an old version of main. Rebase makes it restart from the latest commit on main, as if it had just begun.
after: The ia/chiffres lane now starts from the tip of main: no more lag.

### 3. Propose the work for review
command: glab mr create --fill -t "Figures checked"
check: mr 1 open
The lane is clean: propose it to Stéphane with a merge request (MR). glab is GitLab's command line tool; --fill sends the lane online, -t gives the title.
after: MR !1 is open on origin: ia/chiffres asks to join main. Stéphane can review a short, clear history.
note: An MR means “review before it goes in”.

### 4. Pick up a single useful commit
before: @cd rpt-client
command: git switch main
The typo fix is on the ia/essai lane. To copy it onto main, first move onto main.
after: You are on main, basket in hand.

### 5. Take the fix, not the attempt
command: git cherry-pick ia/essai~1
accepts: git cherry-pick *
cherry-pick means picking just the cherry you want: copy a single commit from another lane onto yours, and leave the rest on the tree.
after: The summary fix is copied onto main. The abandoned attempt stays on its lane, out of everyone's way.

### 6. Set work in progress aside
before: @work intro.md
command: git stash
You are still polishing the intro, but it isn't ready to send: put it in the drawer.
after: intro.md is put away in the stash: your folder is clean.

### 7. Put away a finished desk
before:
- git worktree add ../rpt-ia-essai ia/essai
command: git worktree remove ../rpt-ia-essai
The attempt's desk is no longer needed: remove the folder. The branch stays in the .git.
after: The tile disappeared; the ia/essai lane is still there, in case anyone misses it.

## End
summary: A short, clear history is easier to review, for you, for Stéphane and for Maison Pivert. The report can go out. Have a good weekend.
takeaway: squash folds together, rebase restarts, cherry-pick copies a single commit. Never rewrite a history that is already shared.
next: sandbox deux-ia
