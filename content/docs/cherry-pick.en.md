---
title: git cherry-pick
summary: Copy a single commit from another lane onto yours.
syntax: git cherry-pick <commit>
see: [merge, rebase, log, revert]
---

## What it does

Sometimes you do not want all the work of a lane (a **branch**), just one piece. An AI spent the morning on its lane: a doubtful redesign, and in the middle, a perfect typo fix. `git cherry-pick` "picks the cherry": it copies that one commit (that "snapshot" of the project) onto the lane you are on.

The copy has the same changes and the same message, but it is a **new** commit, with a new number. The original stays where it is on the other lane.

## In the game

In **The lanes**, a new commit appears at the end of your lane: the copy of the one you named. The files in your folder update. You can also click a commit and choose "Cherry-pick here".

The game refuses to copy a merge commit, and tells you when the changes are already on your lane: then there is nothing to copy.

## Example

- `git log ia/resume`: find the commit you want.
- `git cherry-pick c7`: copy it onto your lane.
- `git cherry-pick --abort`: if there is a conflict, everything goes back to how it was.

## Watch out

If the file also changed on your side, it is a **conflict**: the file is marked with a **!**. Pick the version to keep, then `git add` and `git commit` (or `git cherry-pick --continue`). And if you want the whole lane, use `git merge` instead: picking ten cherries one by one takes a while.
