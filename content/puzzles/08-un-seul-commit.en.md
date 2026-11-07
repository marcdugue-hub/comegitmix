---
title: A single commit from another lane
type: choice
timer: 60
repos: [local]
---

## Prompt
On ia/essai, the AI fixed a typo, then launched into a dubious experiment. Only the “typo fixed” commit interests you: copy it onto main, without the experiment.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
git switch -c ia/essai
@work resume.md
git commit -m "typo fixed"
@work intro.md
git commit -m "abandoned attempt"
git switch main
```

## Choices
- [x] git cherry-pick ia/essai~1
- [ ] git merge ia/essai — merge brings back the whole lane, dubious experiment included.
- [ ] git rebase ia/essai — rebase puts main behind the whole lane, experiment included.
- [ ] git cherry-pick ia/essai — the last commit of the lane is precisely the abandoned experiment.

## Goal
main received the fix, and nothing else.

## Takeaway
cherry-pick copies a single commit: pick the cherry, leave the cake.
