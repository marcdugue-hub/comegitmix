---
title: Move your branch back
type: choice
timer: 60
repos: [local]
---

## Prompt
Your last two commits, which never left your machine, were failed attempts. Move the branch back two commits, but keep the content in your files so you can start from there.

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
- [ ] git reset --hard HEAD~2 — --hard also erases the content of the files: clean slate, attempts included.
- [ ] git revert HEAD~2 — revert moves forward by adding a commit; you want to go back.
- [ ] git switch --detach HEAD~2 — you go and look at two commits earlier, but the branch itself does not move.

## Goal
main moved back two commits; plan.md is M: the content of the attempts is kept.

## Takeaway
reset moves the branch back; without --hard, it keeps your files.
