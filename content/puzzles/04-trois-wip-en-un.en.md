---
title: Three “wip” into one
type: choice
timer: 60
repos: [local]
---

## Prompt
The AI left three “wip” commits. Fold them into one before sharing.

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
- [ ] git reset --hard HEAD~3 — reset --hard erases the work instead of grouping it.
- [ ] git revert HEAD~3 — revert adds an undo commit; it doesn't group anything.
- [ ] git merge main — merge brings in another lane; it doesn't tidy this one.

## Goal
A single clean commit on the ia/chiffres lane.

## Takeaway
rebase -i lets you fold (squash) several commits into one before sharing.
