---
title: git revert
summary: Undo a commit by adding a commit that does the opposite.
syntax: git revert <commit>
see: [reset, commit, log, push]
---

## What it does

A commit (a "snapshot" of the project) brought in a mistake, and it is already shared: Stéphane has fetched it, the merge request (MR) went through. No way to rewrite history. `git revert` does the polite thing: it makes a **new commit** that undoes exactly the changes of the old one. What was added is removed, what was removed comes back.

The mistake and its fix both stay in the history. Nothing is erased, nothing is rewritten: everyone can fetch the undo like any other commit.

## In the game

In **The lanes**, a new commit appears at the end of your lane, with a message "Undo ...". The old commit stays where it is. The changes of that commit disappear from the files in your folder. You can also click a commit and choose "Undo this commit".

The game only reverts ordinary commits, not merge commits.

## Example

- `git log`: find the faulty commit.
- `git revert c7`: add the commit that undoes it.
- `git push`: share the undo.
- `git revert --abort`: if there is a conflict, everything goes back to how it was.

## Watch out

If the file has changed since that commit, Git may not know what to undo: it is a **conflict**, marked with a **!**. Pick the version to keep, then `git add` and `git commit`. And do not mix it up with `git reset`, which moves the lane back instead of adding a commit.
