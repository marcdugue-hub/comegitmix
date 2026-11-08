---
title: Propose the AI's work
type: typed
repos: [local, origin]
---

## Prompt
The “summary” assistant has finished its work on the ia/resume lane, and your folder is open on it. Stéphane wants to review before anything goes into main. Propose this work online with a merge request (MR), in a single glab command: the lane is not online yet.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@remote origin
@author ai
git switch -c ia/resume
@work resume.md
git commit -am "summary in ten lines"
@author human
```

## Solution
solution: glab mr create --fill
check:
- mr 1 open

## Goal
A merge request open on origin: ia/resume asks to join main.

## Takeaway
An MR means “review before it goes in”. glab mr create --fill sends the lane online if needed and takes the last commit message as the title; without --fill, you need a git push first.
