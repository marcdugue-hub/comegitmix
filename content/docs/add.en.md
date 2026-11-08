---
title: git add
summary: Choose what goes into the next snapshot of the project.
syntax: git add <file>
see: [commit, status, restore]
---

## What it does

Before saving, you choose. `git add` puts a file in **the index**: the list of what the next **commit** (the next snapshot of the project) will save.

It is like packing a parcel: you put in what should leave, and you leave the rest on the table. The file is not saved yet, it is only **staged**.

## In the game

- `git add <file>`: a single file.
- `git add <folder>`: everything inside it.
- `git add .` or `git add -A`: everything that changed in the folder.

The file appears in **The index**, on the strip of your desk. A new file goes from **U** to **A**; a modified file keeps its **M**, but marked as staged. If nothing had changed, the game tells you: there is nothing to stage.

## Example

An AI fixed `quote.md` and, along the way, also "improved" `contract.md`. You only want to keep the first fix:

- `git add quote.md`: only the quote is staged.
- `git commit -m "Fix the quote"`: the snapshot holds only that.

## Watch out

The index keeps the file **as it was** at the moment of `git add`. If you change it afterwards, run `git add` again so the new version goes.

A file in conflict (**!**) cannot be added until you have chosen which version to keep. Once you have chosen, `git add` confirms that choice.
