---
title: Save the snapshot
type: choice
timer: 60
repos: [local]
---

## Prompt
intro.md is ready and sitting on the counter (staged). All that is left is to press the shutter: save it.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
git add intro.md
```

## Choices
- [x] git commit -m "Intro"
- [ ] git add intro.md — it is already staged; staging it again changes nothing.
- [ ] git push — push sends existing commits online. There is no new one to send yet.
- [ ] git stash — stash puts work in a drawer: nothing enters the history.

## Goal
One more commit on main: the snapshot is taken.

## Takeaway
commit takes the snapshot of what is staged, not one file more.
