---
title: git reset
summary: Move your lane back to an older commit.
syntax: git reset <commit>
see: [revert, restore, stash, log]
---

## What it does

Your lane (your **branch**) is a label stuck on its latest commit, its latest "snapshot" of the project. `git reset` **moves that label back** to an older commit. The commits that came after are no longer part of the lane.

The question is what happens to their changes. Three settings:

- `--soft`: they stay in **the index** (the list of what the next commit will save), ready to be saved again as one commit;
- `--mixed` (the default): they stay in your files, marked **M**, but the index is emptied;
- `--hard`: they are **thrown away**, files included.

Used with a file name, `git reset <file>` does something else entirely: it just takes that file out of the index, like `git restore --staged`.

## In the game

In **The lanes**, the lane's label moves back. Depending on the setting, the changes show up in **The index**, in **On your computer** with the letter **M**, or vanish. In the palette, the game asks: "What happens to the changes?". You can also click a commit and choose "Go back here".

## Example

- `git reset HEAD~1`: undo the last commit, keep its work in the files.
- `git reset --soft HEAD~3`: undo the last 3 commits to redo them as one.
- `git reset --hard main`: make everything just like `main`.

## Watch out

`--hard` erases with no recycle bin. And on a lane Stéphane has already fetched, moving back rewrites history under his feet: use `git revert` instead.
