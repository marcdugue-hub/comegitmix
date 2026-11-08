---
title: git show
summary: Open a commit to see what it changed.
syntax: git show [<commit>]
see: [log, diff, blame]
---

## What it does

A commit is a "snapshot" of the project, but Git also remembers **what changed** since the previous snapshot. `git show` opens a commit: its message, its author, and the files it changed, line by line.

With nothing else, it shows the last commit of your lane. It is the reflex after an AI has been through: "show me what you just recorded".

## In the game

The terminal shows the commit, then the list of changed files with their letter (**A** for a file added, **M** for modified, **D** for deleted). The **diff** screen then opens to compare this commit with the one before: lines removed on one side, lines added on the other.

You name the commit by its id, like `c7`, or by a lane name (its last commit).

## Example

- `git show`: the last commit of your lane.
- `git show c7`: a commit spotted in `git log`.
- `git show ia/resume`: the AI's last commit.

## Watch out

Show changes nothing: it is a command for looking. It shows a commit **already recorded**; for changes not yet committed, use `git diff`. The very first commit has no predecessor: there is no comparison to open.
