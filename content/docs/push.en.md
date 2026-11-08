---
title: git push
summary: Send your lane's commits online, for the team.
syntax: git push [<remote>] [<branch>]
see: [pull, fetch, mr]
---

## What it does

Your commits (the "snapshots" of the project) stay on your computer until you send them. `git push` **publishes** them to the online repository, usually `origin`: the team can then see them, and a merge request (MR) can be opened.

An AI that has finished its work on its lane does the same: it pushes its lane, then proposes an MR.

## In the game

In **In Git**, the **origin** card updates and the dashed `origin/<lane>` label joins the end of your lane in **The lanes**. If the lane did not exist online yet, push creates it.

The first time, `-u` (or `--set-upstream`) tells Git that your lane now **follows** its online twin: the next `git pull` and `git push` will know where to go without being told.

## Example

- `git push -u origin ia/resume`: publish the AI's lane for the first time.
- `git push`: send the new commits.
- `git push --force`: overwrite the online version (best avoided).

## Watch out

If someone pushed before you, Git **refuses**: otherwise you would erase their work. The fix: `git pull`, then `git push`. Forcing (`--force`, `--force-with-lease`) overrides this, and the game warns you: anyone who had the old version will be lost.
