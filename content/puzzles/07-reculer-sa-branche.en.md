---
title: Move your branch back
type: choice
timer: 60
repos: [local]
---

## Prompt
Your last two local commits (never shared) need to be redone. Move the branch back but keep the changes in your files.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "attempt 1"
@work plan.md
git commit -m "attempt 2"
```

## Choices
- [x] git reset HEAD~2
- [ ] git reset --hard HEAD~2 — --hard also erases the changes.
- [ ] git revert HEAD~2 — revert adds a commit instead of moving back.
- [ ] git switch --detach HEAD~2 — you detach HEAD without moving the branch back.

## Goal
main moved back two commits; plan.md is M.

## Takeaway
reset moves the branch back; by default it keeps your files.
