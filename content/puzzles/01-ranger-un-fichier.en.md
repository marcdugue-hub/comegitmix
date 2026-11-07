---
title: Put one file in the snapshot
type: choice
timer: 60
repos: [local]
---

## Prompt
Two files changed, but only intro.md is presentable. Send intro.md alone in the next commit; plan.md is still a rough draft.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
```

## Choices
- [x] git add intro.md
- [ ] git add . — the dot means “everything”: plan.md, rough draft and all, would go too.
- [ ] git commit -am "intro" — -a also drags plan.md along, ready or not.
- [ ] git restore intro.md — restore throws your changes away: intro.md goes back to how it was, and your work evaporates.

## Goal
intro.md staged, plan.md still M (modified, but not in the snapshot).

## Takeaway
add builds the snapshot file by file: only what is staged goes in.
