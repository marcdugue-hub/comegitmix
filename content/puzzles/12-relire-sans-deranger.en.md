---
title: Review without disturbing
type: choice
timer: 60
repos: [local]
---

## Prompt
You have work in progress and need to review the ia/graphiques branch without touching your folder.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "chart"
@author human
git switch main
@work plan.md
```

## Choices
- [x] git worktree add ../revue ia/graphiques
- [ ] git switch ia/graphiques — your folder changes content for the whole review.
- [ ] git stash — useful before a switch, but it does not let you review on its own.
- [ ] git worktree add ../revue -b ia/graphiques — -b creates a new branch, but this one already exists.

## Goal
A revue folder on ia/graphiques; your folder keeps its M files.

## Takeaway
With work in progress, review in a worktree.
