---
title: git checkout
summary: The old do-everything command, now replaced by switch and restore.
syntax: git checkout <branch>
see: [switch, restore, branch]
---

## What it does

`git checkout` is Git's historical Swiss army knife. Depending on what you give it, it does very different things:

- with a lane name (a **branch**), it puts you on that lane;
- with `-b`, it creates a new lane and puts you on it;
- with a file name, it **erases your changes** to that file and goes back to the last saved version.

One command for both "change lane" and "throw away my work" was a bit risky. So Git split it in two: `git switch` to change lanes, `git restore` for files. You will still see `checkout` everywhere, in tutorials and from AIs alike.

## In the game

The command works, but the game always slips in the modern version: "today we write git switch ..." or "git restore ...". The scene reacts exactly as with those two commands: the active lane changes in **The lanes**, or the file loses its **M** letter.

Give it a commit number instead of a lane, and you land on that commit with no lane at all: Git calls this a "detached HEAD".

## Example

- `git checkout main`: same as `git switch main`.
- `git checkout -b ia/resume`: same as `git switch -c ia/resume`.
- `git checkout -- report.md`: same as `git restore report.md`.

## Watch out

`git checkout <file>` throws away your changes without asking. If an AI suggests this command, check that it really means a file whose changes you no longer want.
