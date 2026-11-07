---
title: Bring in a finished lane
type: choice
timer: 60
repos: [local]
---

## Prompt
You have read the AI's summary and it is good. Bring the work from ia/resume into main (you are already on main).

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "summary"
@author human
git switch main
```

## Choices
- [x] git merge ia/resume
- [ ] git switch ia/resume — you go and visit the AI's lane, bringing nothing back.
- [ ] git rebase ia/resume — rebase moves your lane elsewhere; here you just want to bring the result back.
- [ ] git push ia/resume — push sends online, but merges nothing on your side.

## Goal
main now contains the work from ia/resume.

## Takeaway
merge brings a lane back into the one you are standing on.
