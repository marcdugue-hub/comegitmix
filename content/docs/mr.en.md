---
title: Merge request (MR)
summary: Propose to the team to bring a lane in, after review.
syntax: glab mr create --fill
see: [push, merge, fork]
---

## What it does

A merge request (MR) is **not a Git command**: it is a page on the hosting site (GitLab). An AI has finished its work on its lane; rather than merging by itself, it **proposes**: "here is my lane, may I join `main`?". The team reviews, comments, then decides. Each MR has a number, like `!42`.

You can do everything by clicking on the site, or from the terminal with **glab**, GitLab's command line tool:

- `glab mr create`: open an MR for the lane you are on;
- `glab mr list` and `glab mr view 42`: see the MRs in progress;
- `glab mr approve 42`: approve;
- `glab mr merge 42`: merge;
- `glab mr close 42`: drop it.

## In the game

The MR appears on the **origin** card, in **In Git**, with its status: **Open**, **Approved**, **Merged** or **Closed**. Type the `glab` commands, use the palette buttons, or click the MR card: the game always shows the matching `glab` command. From the card, "See the diff" shows what the MR changes.

## Example

- `glab mr create --fill`: sends the lane online if needed, then opens the MR with the last commit message as its title.
- `glab mr create -t "Summary ready"`: the same with your own title (the lane must already be online: `git push -u origin <branch>`).
- `glab mr approve 42`, then `glab mr merge 42`: you review, you accept.
- `git pull`: your computer gets the result.

## Watch out

In the game, no merge without approval (many teams require it too). Once merged online, **your local lanes have not moved**: you need a `git pull`. If both sides changed the same file, the site refuses to merge.

On GitHub, the same thing is called a "pull request", and the tool is `gh`: `gh pr create`, `gh pr merge`.
