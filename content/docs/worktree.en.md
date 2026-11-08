---
title: git worktree
summary: Open a second folder on the same project, so another AI can work there.
syntax: git worktree add ../<folder> -b <branch>
see: [cd, branch, switch, mr]
---

## What it does

A working folder can only show one lane (one **branch**) at a time. If two AIs work in the same folder, they step on each other's toes. `git worktree` solves this: it opens **another folder**, next door, on its own lane. Each folder has its own files and its own **index** (the list of what the next commit will save), but there is **only one .git**: the project's memory is shared.

- `add` opens a new folder;
- `list` shows all the folders and their lane;
- `remove` closes a folder.

## In the game

Each folder is a desk in **On your computer**. After `add`, the new desk appears and becomes active: it is shown at 100 %, the others fade to 60 %. Every command then acts on that desk. A new lane also appears in **The lanes**. To change desks, use `cd`.

## Example

- `git worktree add ../ia-resume -b ia/resume`: a desk for the AI writing the summary.
- `git worktree add ../ia-chiffres -b ia/chiffres`: another one for the AI checking the figures.
- `git worktree list`: who works where.
- `git worktree remove ../ia-resume`: the work is merged, the desk is tidied away.

## Watch out

A lane can be open in **only one** folder at a time. `remove` refuses to close a folder holding unsaved changes (unless you add `--force`, which throws them away), and the original folder, which holds the .git, cannot be closed. Closing a folder does not delete its lane: its commits stay in the .git.
