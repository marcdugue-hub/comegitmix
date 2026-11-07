---
title: Bring in a finished lane
type: choice
timer: 60
repos: [local]
---

## Prompt
The work on ia/resume is approved. Bring it into main (you are on main).

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
- [ ] git switch ia/resume — you change lanes without bringing anything in.
- [ ] git rebase ia/resume — rebase moves your lane; that is not what you want here.
- [ ] git push ia/resume — push sends to the online repository.

## Goal
main contains the work from ia/resume.

## Takeaway
merge brings a lane into the one you are on.
