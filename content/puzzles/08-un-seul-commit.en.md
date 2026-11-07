---
title: A single commit from another lane
type: choice
timer: 60
repos: [local]
---

## Prompt
On ia/essai, only the “typo fixed” commit interests you. Copy it onto main.

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
- [ ] git merge ia/essai — merge also brings in the abandoned attempt.
- [ ] git rebase ia/essai — rebase moves main onto the whole lane.
- [ ] git cherry-pick ia/essai — that is the last commit, the abandoned attempt.

## Goal
main received the fix, not the attempt.

## Takeaway
cherry-pick copies a single commit.
