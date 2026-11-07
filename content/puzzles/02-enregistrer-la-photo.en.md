---
title: Save the snapshot
type: choice
timer: 60
repos: [local]
---

## Prompt
intro.md is staged. Save it.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
git add intro.md
```

## Choices
- [x] git commit -m "Intro"
- [ ] git add intro.md — it is already staged.
- [ ] git push — push sends commits that already exist to the online repository.
- [ ] git stash — stash sets work aside; it saves nothing in the history.

## Goal
One more commit on main.

## Takeaway
commit saves what is in the index.
