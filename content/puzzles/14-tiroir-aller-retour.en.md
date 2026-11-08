---
title: The drawer, there and back
type: typed
repos: [local]
---

## Prompt
You had put your intro.md in the drawer to take a look at ia/resume, as Stéphane asked. The look is done and you are back on main. Take your work out of the drawer.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
git branch ia/resume
@work intro.md
git stash
git switch ia/resume
git switch main
```

## Solution
solution: git stash pop
check:
- desk rapport-client on main
- file rapport-client/intro.md M
- stash rapport-client = 0

## Goal
Your intro.md is modified again (M) and the drawer is empty.

## Takeaway
stash puts away, stash pop takes out: you can visit another branch without losing or saving half-finished work.
