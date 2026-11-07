---
title: Open a lane and move onto it
type: choice
timer: 60
repos: [local]
---

## Prompt
The assistant should work on the outline without trampling main. Create the ia/plan branch and move onto it, in a single command.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git switch -c ia/plan
- [ ] git branch ia/plan — the lane exists, but you are still on main, standing at the closed door.
- [ ] git switch ia/plan — you cannot join a lane that does not exist yet.
- [ ] git worktree add ia/plan — the address of the new folder is missing.

## Goal
Your folder is on the new ia/plan lane.

## Takeaway
switch -c: create the lane and step onto it, in one move.
