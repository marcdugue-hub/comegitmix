---
title: Undo without rewriting
type: choice
timer: 60
repos: [local]
---

## Prompt
The last commit, already shared, is wrong. Undo it without rewriting history.

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
- [ ] git reset --hard HEAD~1 — reset rewrites a history that is already shared.
- [ ] git restore resume.md — restore works on the file, not on the commit.
- [ ] git commit --amend — amend rewrites the last commit.

## Goal
An undo commit added after the mistake.

## Takeaway
revert undoes by moving forward; the history keeps a trace.
