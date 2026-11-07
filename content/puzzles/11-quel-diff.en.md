---
title: Which diff?
type: choice
timer: 60
repos: [local]
---

## Prompt
Which command shows exactly what will go into the next commit?

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
git add intro.md
```

## Choices
- [x] git diff --staged
- [ ] git diff — shows what is not staged yet (plan.md).
- [ ] git status — lists the files, without the lines.
- [ ] git log — shows past history.

## Goal
The diff screen open in “staged” mode.

## Takeaway
git diff --staged = what is in the index.
