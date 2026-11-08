---
title: cd
summary: Move from one folder to another. This is not a Git command.
syntax: cd ../<folder>
see: [worktree, status, branch]
---

## What it does

`cd` (for "change directory") is **not a Git command**: it is a terminal command, the window where you type commands. It moves you from one folder to another, like double-clicking a folder in your file explorer.

The `../` means "go up one level, then into". With `git worktree`, each AI has its own folder, stored next to the others: `cd ../ia-resume` leaves the current folder and goes into the AI's one.

Its little sister `ls` (for "list") shows what the folder you are in contains.

## In the game

Each folder is a desk in **On your computer**. After `cd`, the chosen desk goes to 100 % and the others fade to 60 %. Every Git command you type next acts on that desk, its lane and its index. You can also click a desk and choose "Work in ...".

`ls` lists the files and subfolders of the active desk, without changing anything.

## Example

- `git worktree list`: see the open folders.
- `cd ../ia-resume`: go and see what the summary AI is doing.
- `ls`: have a look at its files.
- `git status`: find out where it stands.

## Watch out

Before typing a command, check **where you are**. A `git commit` typed in the wrong folder saves on the wrong lane. It is the most common mistake when several AIs work in parallel.
