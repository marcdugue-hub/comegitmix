---
title: Share with the team
duration: 12
repos: [local, origin, upstream]
unlocks: [fork, fetch, pull, push]
---

> duo: So far everything stayed on your computer. To work with the team, you need a repository online: the original project, your own copy (the fork), and your local repository.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@remote upstream
```

## Steps

### 1. Make your own copy online
command: fork
A fork is your own online copy of the original project. You can push to it without breaking anything for anyone else.
after: The origin card lit up: that is your fork.

### 2. Save your work
before: @work intro.md
command: git commit -am "Intro"
after: A new local commit, not online yet: the origin/main tag is behind.

### 3. Push
command: git push
Push sends your local commits to origin.
after: origin/main caught up with main. The push arrow moved.

### 4. A colleague has pushed
before:
- @colleague main "Fix the figures"
- @work resume.md
- git commit -m "Summary"
command: git push
check: error push-rejected
You try to push a new commit… rejected: the online version has moved on.
after: Git refuses: you first need to fetch your colleague's work.

### 5. Fetch without merging
command: git fetch
fetch downloads what is online without touching your folder.
after: The origin/main tag moved forward; your main did not move.

### 6. Fetch and bring in
command: git pull
pull = fetch + merge.
after: main contains your colleague's work. You can push again.

## End
summary: Local, origin, upstream: three repositories, and commands to keep them in sync.
takeaway: push sends, fetch looks, pull fetches and brings in.
next: mission 06-relire-une-mr
