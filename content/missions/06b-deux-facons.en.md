---
title: Two ways to review an MR
mode: compare
---

The same MR !42, reviewed twice. What changes: what happens to your desk during the review.

## Column — On a branch
replays: 06-relire-une-mr part A
desk: intact, stashed, stashed, changed, changed, changed, restored

## Column — In a worktree
replays: 06-relire-une-mr part B
desk: intact, intact, intact, intact, intact, intact

## When to choose which?
**On a branch**: for a quick look, when you have nothing in progress.
**In a worktree**: as soon as you have work in progress, the review takes a while, or several MRs are waiting (one folder per MR).

## Trap
`fatal: 'ia/graphiques' is already used by worktree at '…/rapport-ia-graphiques'`
A branch can be open in only one folder at a time. If the assistant already opened it in its desk, go and review in that desk (`git worktree list` shows it).

## MR or PR?
Merge request (GitLab) and pull request (GitHub) are the same thing: a request to merge, waiting for review.
