---
title: A first snapshot
duration: 10
repos: [local]
unlocks: [status, add, commit]
---

> duo: Before you put an AI to work, you need to know how to keep track of your own work. A commit is a snapshot of the project at a given moment.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "Folder created"
@work intro.md
```

## Steps

### 1. See what changed
command: git status
Git compares your folder with the last snapshot and tells you what moved.
after: intro.md shows an M: you changed it since the last snapshot.

### 2. Work on another file
command: (click plan.md in your folder)
check: file rapport-client/plan.md M
Clicking a file means “I worked on it”. It turns to M.
after: Two files are modified. Nothing is saved yet.

### 3. Choose what goes into the snapshot
command: git add intro.md
The index is the table where you lay out what will go into the next snapshot. You choose file by file.
after: intro.md moved into the index (blue letter). plan.md stays M: it will not be part of the snapshot.
note: The index = what goes into the snapshot

### 4. Take the snapshot
command: git commit -m "Introduction rewritten"
accepts: git commit -m "*"
A commit saves a snapshot of everything in the index, with a message.
after: A new dot appeared on the main lane. intro.md is clean again; plan.md is still M.

## End
summary: You can save your work in small snapshots, choosing what goes into each one.
takeaway: status to look, add to choose, commit to save.
next: mission 02-une-voie-pour-l-ia
