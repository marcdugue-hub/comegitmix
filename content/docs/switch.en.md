---
title: git switch
summary: Move your folder onto another lane.
syntax: git switch <branch>
see: [branch, stash, worktree, checkout]
---

## What it does

`git switch` changes the lane (the **branch**) your folder works on. The files in the folder change to match the last **commit** (the last snapshot) of that lane. Your next commits will be added to it.

Same desk, but you swapped the folder lying on it.

## In the game

Your desk's label, in **On your computer**, shows the new lane, and its files update.

- `git switch <branch>`: goes onto an existing lane.
- `git switch -c <branch>`: creates the lane and goes onto it, in one gesture.
- `git switch --detach <commit>`: goes to look at an old snapshot, with no lane.

If the lane only exists online (`origin/<branch>`), the game makes a local copy of it and opens it.

## Example

The AI has finished its work on `ia/summary`; you want to read it:

- `git switch ia/summary`: the folder shows its work.
- `git switch main`: back to the reference version.

## Watch out

Your unsaved changes follow you from one lane to another. If the other lane changed the same files, Git refuses so as not to overwrite anything: do a `git commit` or a `git stash` first.

A lane can only be open in one folder at a time. If an AI holds it in its own folder (`git worktree`), let it finish.
