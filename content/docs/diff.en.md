---
title: git diff
summary: See line by line what changed, without changing anything.
syntax: git diff
see: [status, add, mr, show]
---

## What it does

`git status` tells you **which** files changed; `git diff` shows you **what** changed inside them. Removed lines are in red, added lines in green. You only look: nothing is changed.

Three questions, three ways to use it:

- `git diff`: my changes not yet added to **the index** (the list of what the next commit will save);
- `git diff --staged`: what is in the index, so exactly what the next commit will contain;
- `git diff main ia/resume`: the difference between two lanes (two **branches**).

It is the best habit before accepting an AI's work: read what it really changed, not just what it says it did.

## In the game

A "The diff" screen opens, with three tabs: "My changes", "Staged" and "Between two lanes". Two displays to choose from: "Side by side" (before on the left, after on the right) or "Unified" (everything in one column). You can also open the diff of a file from your desk's file tree.

## Example

- `git diff report.md`: just that file.
- `git diff --staged`: check before `git commit`.
- `git diff main...ia/resume`: with three dots, only what the AI's lane brings since it left `main`. That is what a merge request (MR) shows.

## Watch out

A new file (letter **U**) does not show in `git diff`: Git does not follow it yet. Run `git add`, then `git diff --staged`.
