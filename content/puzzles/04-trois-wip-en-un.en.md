---
title: Three “wip” into one
type: choice
timer: 60
repos: [local]
---

## Prompt
The AI saved its work three times, with “wip” (“work in progress”) as its only comment. Before showing this to the team, fold those three commits into one.

## Setup
```git-setup
@files rapport.md
git commit -m "First draft"
@author ai
git switch -c ia/chiffres
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
@work rapport.md
git commit -m "wip"
```

## Choices
- [x] git rebase -i HEAD~3
- [ ] git reset --hard HEAD~3 — reset --hard erases the work instead of grouping it. The AI would not forgive you.
- [ ] git revert HEAD~3 — revert adds an undo commit: you would have four commits, not one.
- [ ] git merge main — merge brings two lanes together; it does not tidy this one.

## Goal
A single clean commit on the ia/chiffres lane, instead of three “wip”.

## Takeaway
rebase -i folds (squashes) several commits into one: tidy up before you share.
