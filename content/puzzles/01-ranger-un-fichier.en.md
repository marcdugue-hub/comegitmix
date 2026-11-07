---
title: Put one file in the snapshot
type: choice
timer: 60
repos: [local]
---

## Prompt
You want only intro.md to go into the next commit.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
```

## Choices
- [x] git add intro.md
- [ ] git add . — git add . stages every file, plan.md included.
- [ ] git commit -am "intro" — -a also saves plan.md.
- [ ] git restore intro.md — restore throws away your changes.

## Goal
intro.md staged, plan.md still M.

## Takeaway
add chooses, file by file, what goes into the snapshot.
