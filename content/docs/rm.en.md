---
title: git rm
summary: Delete a file and stage that deletion for the next commit.
syntax: git rm <file>
see: [add, commit, restore]
---

## What it does

Deleting a file is also a change to save. If you erase a file from the folder, Git notices, but it waits for you to confirm.

`git rm` does both gestures at once: it erases the file from the folder **and** puts that deletion in **the index** (the list of what the next commit will save). At the next **commit** (the next snapshot of the project), the file will be gone.

The older photos still keep it: nothing is lost for good.

## In the game

Two ways to do it:

- `rm <file>`: the computer's ordinary command. The file disappears from the folder and Git marks it **D** (deleted). Then `git add` and `git commit` save the deletion.
- `git rm <file>`: the file is deleted and the deletion is already staged. Only the `git commit` is left.

With `rm`, a new file (**U**), which Git never saved, simply disappears: there is nothing to save.

## Example

The AI left a draft lying around, `ai-notes.md`, which has no business in the project:

- `git rm ai-notes.md`
- `git commit -m "Remove the AI's working notes"`

## Watch out

Deleting a file in conflict (**!**) is not a way to settle the conflict: the game first asks you to choose which version to keep.

Changed your mind before the commit? `git restore --staged <file>` then `git restore <file>` bring it back.
