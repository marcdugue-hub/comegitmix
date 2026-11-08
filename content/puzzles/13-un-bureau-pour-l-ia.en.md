---
title: A desk for the AI
type: typed
repos: [local]
---

## Prompt
Stéphane wants the AI to work on the charts without touching your folder. Create a separate folder for it, ../rapport-ia-graphiques, on a new branch ia/graphiques.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Solution
solution: git worktree add ../rapport-ia-graphiques -b ia/graphiques
check:
- desk rapport-ia-graphiques on ia/graphiques

## Goal
A new folder on the ia/graphiques branch, linked to the same .git.

## Takeaway
worktree add -b creates the branch and its folder in one go: the AI works at its place, you work at yours.
