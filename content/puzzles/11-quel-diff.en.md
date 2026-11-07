---
title: Which diff?
type: choice
timer: 60
repos: [local]
---

## Prompt
Before saving, you want to proofread exactly what will go into the next commit, line by line. Which command?

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
git add intro.md
```

## Choices
- [x] git diff --staged
- [ ] git diff — shows what is not staged yet (plan.md), so the opposite.
- [ ] git status — gives the list of files, not their content.
- [ ] git log — tells the past, not what is about to leave.

## Goal
The diff screen open in “staged” mode.

## Takeaway
git diff --staged: proofreading what is staged.
