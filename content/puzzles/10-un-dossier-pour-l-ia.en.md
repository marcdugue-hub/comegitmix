---
title: One more folder for the AI
type: choice
timer: 60
repos: [local]
---

## Prompt
A new assistant arrives and needs a desk of its own: its own folder, on its own ia/sources branch, without copying the whole project.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git worktree add ../rapport-ia-sources -b ia/sources
- [ ] git clone . ../rapport-ia-sources — clone photocopies the whole project: two .git, two histories that will drift apart.
- [ ] git branch ia/sources — a lane, but no desk to work at.
- [ ] git switch -c ia/sources — it is your own desk that moves onto the new lane.

## Goal
A new folder on the ia/sources branch, with the same .git.

## Takeaway
worktree add: one more desk, linked to the same project.
