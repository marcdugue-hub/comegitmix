---
title: Set your changes aside
type: choice
timer: 60
repos: [local]
---

## Prompt
A colleague asks you to look at another branch, right now. Your intro.md is half written. Set it aside without saving it, until you come back.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
```

## Choices
- [x] git stash
- [ ] git commit -am "wip" — you save work that is not ready, and it will stay in the history.
- [ ] git restore intro.md — your changes go straight to the bin.
- [ ] git add intro.md — the index prepares the next snapshot; it is not a hiding place.

## Goal
Clean folder, one entry in the stash (the drawer).

## Takeaway
stash puts work in progress in a drawer; stash pop takes it back out.
