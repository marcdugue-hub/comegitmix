---
title: git init
summary: Turn an ordinary folder into a Git repository.
syntax: git init
see: [add, commit, gh, remote]
---

## What it does

A folder on your disk is not a Git repository until you tell Git. `git init` creates, inside that folder, a hidden subfolder named **.git**: it is the project's memory, where Git will keep every snapshot (commits), the lanes and the stash.

Your files do not move and are not saved yet: Git sees them but does not track them yet. Then `git add` and `git commit` take the first snapshot.

## In the game

Before `git init`, the top card says "No Git repository yet" and every git command answers "not a git repository". Afterwards, the **Local repository · .git** card appears, your files get the letter **U** (not tracked yet) and the **main** lane waits for its first commit.

The "No Git" sandbox start and mission 8 begin from such a folder.

## Example

- `git status`: refused, no repository here.
- `git init`: the .git folder is created.
- `git add .` then `git commit -m "First commit"`: the first snapshot.

## Watch out

You type `git init` only once per project, in the project folder. To get a project that already exists online, you do not use `git init` but `git clone`, which copies the whole repository. Older versions of Git call the first lane `master` instead of `main`.
