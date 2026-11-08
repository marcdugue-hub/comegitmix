---
title: git status
summary: Take stock: what changed, what is ready, which lane you are on.
syntax: git status
see: [add, diff, log]
---

## What it does

`git status` changes nothing: it looks and it tells. It is the "where are we?" question asked to Git.

It answers three things:

- which lane (a **branch**) this folder works on;
- which files changed since the last **commit** (the last saved snapshot of the project);
- which ones are already in **the index**, the list of what the next commit will save.

It also flags an operation in progress, like a merge stuck on a conflict.

## In the game

The game sums up the answer in one sentence: how many files changed, how many are staged. The details give the lane, then the files sorted by kind; hover a line and the file lights up in the scene.

On your desk, in **On your computer**, each file already carries its letter: **M** modified, **U** new (Git does not know it yet), **A** staged, **D** deleted, **!** in conflict.

When nothing has moved, the game tells you: the folder matches the last commit of its lane exactly.

## Example

An AI has just worked in your folder. Before trusting it:

- `git status`: two files modified, one new, nothing staged.
- `git diff`: you look at what it really changed.

## Watch out

No risk: it only reads. Type it before every command that changes something; it is Git's "look before you cross the road".

It only talks about the folder you are in. Another desk (another working folder) has its own state.
