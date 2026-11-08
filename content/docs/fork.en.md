---
title: fork
summary: Make your own online copy of a project that is not yours.
syntax: fork
see: [remote, push, mr]
---

## What it does

Careful: `fork` is **not a Git command**. It is a button on the hosting site (GitLab, GitHub), where the project lives online.

You want to contribute to a project you do not hold the keys to. Instead of asking for permission to write in it, you make an **online copy in your name**: a fork. You work there freely, then propose your changes to the original project with a merge request (MR).

By convention, the original project is called `upstream` and your copy `origin`.

## In the game

In **In Git**, a new card appears: **origin**, your copy online, linked to **upstream** by a "fork" arrow. Your computer now knows origin: its lanes show up as `origin/…` labels in **The lanes**.

You just type `fork` in the terminal (no `git`), or click the button in the palette.

## Example

- `fork`: origin becomes your copy of upstream.
- `git remote -v`: check that both online repositories are known.
- `git push`: send your work to origin, never straight to upstream.

## Watch out

You fork **only once**. If origin already exists, the game refuses: you already have your copy. And a fork does not update itself: if the original project moves on, your copy stays where it was.
