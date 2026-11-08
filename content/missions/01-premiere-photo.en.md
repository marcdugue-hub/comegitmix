---
title: A first snapshot
duration: 10
repos: [local]
unlocks: [status, add, commit]
---

> duo: Monday, 9 a.m. The report for your client, Maison Pivert, is due on Friday, and AI assistants are going to help. Before you hand them anything, learn to keep track of your own work: a commit is a snapshot of the project at a given moment.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "Folder created"
@work intro.md
```

## Steps

### 1. See what changed
command: git status
Git compares your folder with the last snapshot and tells you what moved. Think of a very observant colleague who never judges.
after: intro.md shows an M (modified): you changed it since the last snapshot. That first coffee was productive.

### 2. Work on another file
command: (click plan.md in your folder)
check: file rpt-client/plan.md M
Clicking a file means “I worked on it”. This time, it's the outline.
after: Two files are modified, and no snapshot has been taken yet.

### 3. Choose what goes into the snapshot
command: git add intro.md
The index is the table where you lay out what will go into the next snapshot. The outline isn't ready? It stays out of the frame.
after: intro.md moved into the index (blue letter). plan.md stays M: it won't be in the picture.
note: The index = what goes into the snapshot

### 4. Take the snapshot
command: git commit -m "Introduction rewritten"
accepts: git commit -m "*"
A commit saves a snapshot of everything in the index, with a message. Six months from now, “Introduction rewritten” will help you far more than “stuff”.
after: A new dot appeared on the main lane: that's your snapshot. intro.md is clean again; plan.md is still waiting as M.

## End
summary: First snapshot of the Pivert report, and you chose exactly what was in the frame.
takeaway: status to look, add to choose, commit to save.
next: mission 02-une-voie-pour-l-ia
