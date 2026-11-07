---
title: Review before accepting
duration: 14
repos: [local]
unlocks: [log, merge, revert, restore, reset, blame]
---

> duo: The “summary” assistant is done. Before accepting its work, we review it, keep what is good, and learn how to undo what is not.

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
git diff on its own shows your changes that are not staged yet. Look: notes.md is not there.
after: Only intro.md shows up. A new file (U) is not in git diff until it is staged.
note: U = Git is not tracking it yet

### 2. What is staged
command: git add intro.md notes.md
after: Both files are in the index: intro.md as a blue M, notes.md as A.

### 3. Check what will go into the commit
command: git diff --staged
opens: diff
diff-mode: staged
--staged shows exactly what is in the index, so what will go into the next commit.
after: You find intro.md again and, this time, notes.md too.

### 4. Save
command: git commit -m "Notes and intro"
accepts: git commit -m "*"
after: One more dot on main, and the index is empty.

### 5. Read the assistant's history
command: git log ia/resume
opens: log
The log lists the commits of a lane, newest first, with their author.
after: Two commits marked AI on ia/resume.

### 6. Accept the work
command: git merge ia/resume
You bring the assistant's lane into main.
after: The two lanes join: main now contains the assistant's work.

### 7. After all, undo part of it
command: git revert HEAD
revert adds a commit that cancels the previous one, without rewriting history: ideal when the work is already shared.
after: A new “undo” dot appeared. The history keeps a trace of everything.
note: reset goes back, revert undoes by moving forward

## End
summary: You can look before accepting, accept, and undo cleanly.
takeaway: diff to look, merge to accept, revert to undo without erasing.
next: mission 05-partager-avec-l-equipe
