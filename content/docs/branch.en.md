---
title: git branch
summary: Create, list or delete lanes, without moving.
syntax: git branch <name>
see: [switch, merge, worktree]
---

## What it does

A **branch** is a lane of work: a series of **commits** (snapshots of the project) that moves forward on its own, without disturbing the others. You open one per topic: one for the summary, one for the figures, one for the AI's slightly risky experiment.

`git branch <name>` creates the lane where you are. Careful, it does not take you there: you stay on your current lane.

## In the game

A new lane branches off your current commit in **The lanes**, with its name.

- `git branch`: lists all lanes; a star marks yours.
- `git branch <name> <commit>`: starts the lane from another point.
- `git branch -d <name>`: deletes a lane whose work is already merged.
- `git branch -D <name>`: deletes it even if the work is merged nowhere.

## Example

You hand two topics to two AIs:

- `git branch ia/summary`
- `git branch ia/figures`

Each one gets its lane; `main` stays quiet.

## Watch out

To create a lane **and** go onto it, use `git switch -c <name>`. People often forget: they create the lane, then keep working… on the old one.

`-D` erases unmerged work: its commits fade away with the lane. And a lane open in a folder cannot be deleted while it is in use.
