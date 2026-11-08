---
title: git rebase
summary: Replay your commits somewhere else, or tidy them up before showing them.
syntax: git rebase <branch>
see: [merge, cherry-pick, log, reset]
---

## What it does

`git rebase` has two uses.

**Start again from elsewhere.** Your AI started its lane (its **branch**) on Monday; since then, `main` has moved on. `git rebase main` takes its commits (its "snapshots" of the project) one by one and replays them at the end of `main`, as if it had started today. The history becomes a straight line.

**Tidy up.** `git rebase -i HEAD~3` (i for "interactive") opens the list of your last 3 commits. For each one you choose: **keep** it (pick), **reword** its message, **squash** it into the one before, or **drop** it. You can also change their order. Handy when an AI made twelve "wip" commits for a single idea.

## In the game

In **The lanes**, the replayed commits reappear at the end of the other lane, with new numbers. With `-i`, a panel opens: one row per commit, oldest first, a menu for the action and arrows to reorder. The game only accepts a straight lane, with no merge commit.

## Example

- `git rebase main`: the current lane starts again from the end of `main`.
- `git rebase -i HEAD~4`: squash or clean up the last 4 commits.
- `git rebase --continue` / `--abort`: after a conflict, carry on or cancel everything.

## Watch out

Rebase makes **new** commits. If Stéphane already works on this lane, he keeps the old ones and everything gets tangled. Simple rule: rebase your own lane, never a shared one.
