---
title: Set your changes aside
type: choice
timer: 60
repos: [local]
---

## Prompt
You need to switch branches but intro.md is not ready. Set it aside without saving it.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
```

## Choices
- [x] git stash
- [ ] git commit -am "wip" — you save work that is not ready.
- [ ] git restore intro.md — you lose your changes.
- [ ] git add intro.md — the index is not a hiding place.

## Goal
Clean folder, one entry in the stash.

## Takeaway
stash puts work in progress away; stash pop brings it back.
