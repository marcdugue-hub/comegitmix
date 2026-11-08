---
title: git log
summary: The history of a lane, from the newest commit to the oldest.
syntax: git log [<lane>]
see: [show, blame, diff]
---

## What it does

Each commit is a "snapshot" of the project, with a message, a date and an author. `git log` unrolls them like an album, **newest first**, going back along the lane you are on.

It is the first thing to look at when you wonder "what happened here?", especially after a morning where three AIs worked in parallel.

## In the game

The **History** screen opens: the list of the lane's commits, each with its message, the number of files touched and its author. The AI's commits are **marked**, so you always know who did what. Merge commits are flagged too. The terminal shows the same list, one line per commit.

With a lane name, you read the history of another lane without going there.

## Example

- `git log`: the story of the current lane.
- `git log ia/resume`: what the AI did on its lane.
- `git show c7`: open a commit from the list to see what it changed.

## Watch out

The log only shows **recorded** commits. Files changed but not committed yet (letters **M** or **U**) are not in it: for those, use `git status`. And a brand-new project, with no commit at all, has an empty history.
