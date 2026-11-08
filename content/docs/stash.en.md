---
title: git stash
summary: Put the work in progress aside while you do something else.
syntax: git stash
see: [switch, restore, worktree]
---

## What it does

You are in the middle of something, nothing is ready to save, and an emergency lands. `git stash` stores your changes in **the stash**: a cupboard where they wait, without a **commit** (without an official photo). The folder becomes clean again, identical to the last photo.

Later, you take everything back out and pick up where you left off.

## In the game

In the game, each folder has its own stash (in real Git, one stash is shared by all the folders of the project). It shows in **The index**, at the end of the desk's strip, with the number of entries stored.

- `git stash`: puts modified and staged files aside.
- `git stash pop`: brings them back and empties that stash entry.
- `git stash apply`: brings back a copy; the entry stays stored.
- `git stash list`: shows what is stored.
- `git stash drop`: throws away the last entry.

## Example

Stéphane needs a fix right now on `main`, but your folder is a building site:

1. `git stash`: the building site goes into the stash.
2. `git switch main`, the fix, `git commit`.
3. `git switch` back to your lane, then `git stash pop`: the work comes back.

## Watch out

New files (**U**), never added with `git add`, do not go into the stash: they stay in the folder.

If the same file changed in the meantime, taking the stash back out creates a **conflict** (**!**): choose the version to keep. The entry then stays in the stash, to be safe.

The stash is for a few minutes. For a real second piece of work, prefer a lane or a second folder (`git worktree`).
