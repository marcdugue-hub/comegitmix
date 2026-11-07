---
title: Undo without rewriting
type: choice
timer: 60
repos: [local]
---

## Prompt
The last commit, already shared with the team, contains a mistake. Undo it without making history disappear: your colleagues have already read it.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work resume.md
git commit -m "mistake"
@remote origin
```

## Choices
- [x] git revert HEAD
- [ ] git reset --hard HEAD~1 — reset erases a commit that others already have: at the next exchange, everyone is lost.
- [ ] git restore resume.md — restore touches the file, not the commit: the mistake would stay in the history.
- [ ] git commit --amend — amend replaces the last commit: that is rewriting history, precisely.

## Goal
An undo commit added after the mistake: the mistake stays visible, and fixed.

## Takeaway
revert undoes by moving forward: nothing is erased, everything is explained.
