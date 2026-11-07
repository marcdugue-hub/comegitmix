---
title: Share with the team
duration: 12
repos: [local, origin, upstream]
unlocks: [fork, fetch, pull, push]
---

> duo: Thursday afternoon. Stéphane, your colleague, needs to review the report. So far everything stayed on your computer: time to go online. Three repositories enter the scene: the original project (upstream), your own online copy (the fork, called origin) and your local repository.

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
after: The origin card lit up: that's your fork, your copy online.

### 2. Save your work
before: @work intro.md
command: git commit -am "Intro"
You touched up the intro. -am saves, in one go, every already-tracked file that was modified.
after: A new commit on your side, not online yet: the origin/main tag, what you know of the online version, is behind.

### 3. Push
command: git push
Push sends your local commits to origin, your copy online.
after: origin/main caught up with main. Stéphane can now read your intro.

### 4. Stéphane pushed first
before:
- @colleague main "Fix the figures"
- @work resume.md
- git commit -m "Summary"
command: git push
check: error push-rejected
Meanwhile, Stéphane pushed a fix to the figures. You try to push your summary… rejected: the online version moved on without you.
after: Git refuses to overwrite Stéphane's work. You need to fetch it first.

### 5. Fetch without merging
command: git fetch
fetch downloads what is online without touching your folder. You look at the parcel before opening it.
after: The origin/main tag moved forward; your main did not move.

### 6. Fetch and bring in
command: git pull
pull = fetch + merge: download, then bring it into your main.
after: main contains Stéphane's fix. You can push again.

## End
summary: Local, origin, upstream: three repositories, and commands to keep them in agreement. You and Stéphane no longer tread on each other's toes.
takeaway: push sends, fetch looks, pull fetches and brings in.
next: mission 06-relire-une-mr
