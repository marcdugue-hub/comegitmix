---
title: Review before accepting
duration: 14
repos: [local]
unlocks: [log, merge, revert, restore, reset, blame]
---

> duo: Thursday. The “summary” assistant has handed in its work, in two versions. Before accepting it, you review, keep what is good, and learn how to undo what is not. But first, your own notes.

## Setup
```git-setup
@files plan.md intro.md resume.md sources.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "summary v1"
@work resume.md sources.md
git commit -m "summary v2"
@author human
git switch main
@work intro.md
@new notes.md
```

## Steps

### 1. What you changed
command: git diff
opens: diff
diff-mode: work
git diff on its own shows your changes that are not staged yet, meaning not in the index yet. Look closely: notes.md is not there.
after: Only intro.md shows up. notes.md is new (U): Git is not tracking it yet, so git diff leaves it out until it is staged.
note: U = Git is not tracking it yet

### 2. What is staged
command: git add intro.md notes.md
Put both files in the index, newcomer included.
after: Both files are in the index: intro.md as a blue M, notes.md as A (added).

### 3. Check what will go into the commit
command: git diff --staged
opens: diff
diff-mode: staged
--staged shows exactly what is in the index, so what will go into the next commit. It's Git's “read it again before you hit send”.
after: You find intro.md again and, this time, notes.md too.

### 4. Save
command: git commit -m "Notes and intro"
accepts: git commit -m "*"
Your notes are ready: take the snapshot.
after: One more dot on main, and the index is empty, ready for what comes next.

### 5. Read the assistant's history
command: git log ia/resume
opens: log
The log lists the commits of a lane, newest first, with their author: the assistant's logbook.
after: Two commits marked AI on ia/resume: a v1, then a v2. It had second thoughts.

### 6. Accept the work
command: git merge ia/resume
The summary works for you: bring the assistant's lane into main. That's a merge.
after: The two lanes join: main now contains the assistant's work.

### 7. After all, undo part of it
command: git revert HEAD
Ms Pivert calls: she preferred the old summary. revert adds a commit that cancels the previous one, without rewriting history: ideal when the work is already shared.
after: A new “undo” dot appeared. The history keeps a trace of everything, change of mind included.
note: reset goes back, revert undoes by moving forward

## End
summary: You can look before accepting, accept, and undo cleanly. Clients are allowed to change their minds, and now you can keep up.
takeaway: diff to look, merge to accept, revert to undo without erasing.
next: mission 05-partager-avec-l-equipe
