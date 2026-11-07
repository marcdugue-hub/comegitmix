---
title: One more folder for the AI
type: choice
timer: 60
repos: [local]
---

## Prompt
Give a new assistant its own folder and its own ia/sources branch, without a new repository.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git worktree add ../rapport-ia-sources -b ia/sources
- [ ] git clone . ../rapport-ia-sources — clone copies the whole repository: two .git.
- [ ] git branch ia/sources — a branch without a folder.
- [ ] git switch -c ia/sources — your own folder changes branch.

## Goal
A new folder on the ia/sources branch, same .git.

## Takeaway
worktree add = one more folder, linked to the same repository.
