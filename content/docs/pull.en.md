---
title: git pull
summary: Get the online work and bring it into your lane.
syntax: git pull [<remote>] [<branch>]
see: [fetch, merge, push]
---

## What it does

`git pull` is two commands in one: a `git fetch` (download what is new online), then a `git merge` (bring that online version into the lane you are on).

It is the morning routine: before starting an AI on a new topic, you update your lane with what the team published overnight.

## In the game

The dashed `origin/…` labels update, then your lane joins them in **The lanes**. If your lane had not moved, it simply moves forward to the end of the online version. Otherwise, a merge commit appears. The files in your folder update.

Without details, pull uses the online lane your lane already follows (usually `origin/<same name>`).

## Example

- `git pull`: update the current lane.
- `git pull upstream main`: bring the original project into your lane.
- `git push`: after the pull, your push will go through.

## Watch out

If someone changed **the same file** as you, it is a **conflict**, just like a merge: the file is marked with a **!**, you choose what to keep, then `git add` and `git commit`. And pull will not start if you are on no lane, or if an operation (merge, rebase) is already in progress.
