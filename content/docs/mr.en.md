---
title: Merge request (MR)
summary: Propose to the team to bring a lane in, after review.
syntax: (site) Approve the MR, then Merge
see: [push, merge, fork]
---

## What it does

A merge request (MR) is **not a Git command**: it is a page on the hosting site (GitLab). GitHub calls the same thing a "pull request".

An AI has finished its work on its lane and pushed it online. Rather than merging by itself, it **proposes**: "here is my lane, may I join `main`?". The team reviews, comments, then decides. Each MR has a number, like `!42`.

## In the game

The MR appears on the **origin** card, in **In Git**, with its status. It goes through four steps:

1. **Open**: the lane asks to come in (often the AI opens it).
2. **Approved**: someone reviewed it and said "it can go in".
3. **Merged**: the merge happens online, on origin.
4. Or **Closed**: dropped without merging.

The "approve MR" and "merge MR" buttons in the palette, or a click on the MR card, do these actions. From the card, "See the diff" shows what it changes.

## Example

- `approve MR !42`: you approve on the site.
- `merge MR !42`: you merge on the site.
- `git pull`: your computer gets the result.

## Watch out

No merge without approval. And once merged online, **your local lanes have not moved**: you need a `git pull`. If both sides changed the same file, the site refuses to merge.
