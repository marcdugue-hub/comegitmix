---
title: git merge
summary: Bring the work of another lane into yours.
syntax: git merge <branch>
see: [rebase, switch, mr]
---

## What it does

You asked an AI to work on its own lane (a **branch**), out of the way. Its work is ready: `git merge` brings it into the lane you are on.

You always merge **towards yourself**: first go to the lane that should receive the work (often `main`, the reference version), then name the one you want to bring in.

## In the game

In **The lanes**, the merged lane joins yours with a curve, and a new commit (a "merge commit") appears where they meet. The files in your folder update.

If your lane had not moved in the meantime, Git does not even create a merge commit: it simply **moves** your lane forward to the end of the other one (a "fast-forward").

## Example

- `git switch main`: go to the lane that receives.
- `git merge ia/resume`: the AI's work enters `main`.
- `git merge --abort`: if there is a conflict, everything goes back to how it was.

## Watch out

If both lanes changed **the same file**, Git does not choose for you: it is a **conflict**. The file is marked with a **!**, you pick the version to keep (yours, theirs or both), then `git add` and `git commit` finish the merge. Nothing is lost until you decide.
