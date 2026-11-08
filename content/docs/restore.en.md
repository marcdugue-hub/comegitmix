---
title: git restore
summary: Undo the changes to a file, or take it out of the index.
syntax: git restore <file>
see: [add, status, reset, stash]
---

## What it does

`git restore` goes backwards on a file, before you even take the photo. It has two uses:

- `git restore <file>`: the file goes back to its last saved version. The changes made in the folder are **thrown away**.
- `git restore --staged <file>`: the file leaves **the index** (the list of what the next commit will save). Your changes stay in the folder.

## In the game

With `git restore <file>`, the **M** letter disappears: the file is identical to the photo again. With `--staged`, the file leaves the strip in **The index** and gets its **M** back (or its **U** if it is new).

`git restore --staged --worktree <file>` does both at once. During a conflict, `--ours` or `--theirs` picks the version to keep: yours or the incoming one.

## Example

The AI "harmonised" `charter.md` by turning every formal "you" into a casual one. That was not the plan:

- `git restore charter.md`: the file is back as it was.

## Watch out

`git restore <file>` is one of the few commands that **lose** work: what was never saved disappears, with no recycle bin. When in doubt, put the changes aside with `git stash` instead.

A new file (**U**) has no previous version: `git restore` cannot bring anything back.
