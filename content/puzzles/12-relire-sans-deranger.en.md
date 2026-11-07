---
title: Review without disturbing
type: choice
timer: 60
repos: [local]
---

## Prompt
Your folder is full of work in progress, and you are asked to review the AI's charts on the ia/graphiques branch. Review them without touching your folder.

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
- [ ] git switch ia/graphiques — your whole folder changes content during the review: goodbye, rough drafts.
- [ ] git stash — a good reflex before a switch, but on its own it gives you nothing to review.
- [ ] git worktree add ../revue -b ia/graphiques — -b creates a new branch; this one already exists, so Git will refuse.

## Goal
A revue folder on ia/graphiques; your folder keeps its M files, untouched.

## Takeaway
With work in progress, review in a worktree: a second desk, a single project.
