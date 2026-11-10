---
title: Everything in the first snapshot
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
git init has just created the repository. The three files are U. Prepare all of them for the first snapshot, in one command.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
```

## Choices
- [x] git add .
- [ ] git add README.md — only the README would go into the snapshot; the agenda and the sign-up list would stay U.
- [ ] git commit -m "First commit" — nothing is in the index yet: Git has nothing to take a snapshot of.
- [ ] git init — the repository already exists; git init prepares no file.

## Goal
README.md, programme.md and inscrits.csv in the index, as A, ready for the first commit.

## Takeaway
The dot in git add . means “the whole folder”: handy for the very first snapshot, to be used with care afterwards.
