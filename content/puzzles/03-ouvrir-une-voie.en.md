---
title: Open a lane and move onto it
type: choice
timer: 60
repos: [local]
---

## Prompt
Create the ia/plan branch and move your folder onto it, in a single command.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git switch -c ia/plan
- [ ] git branch ia/plan — creates the lane, but your folder stays on main.
- [ ] git switch ia/plan — the branch does not exist yet.
- [ ] git worktree add ia/plan — the folder path is missing.

## Goal
Your folder is on the new ia/plan lane.

## Takeaway
switch -c creates the branch and moves onto it.
