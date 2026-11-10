---
title: Not a repository yet
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
Your atelier-ia folder holds three files, but git status answers “not a git repository”. Which command makes it a Git repository, without downloading anything?

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
```

## Choices
- [x] git init
- [ ] git clone https://github.com/demo/atelier-ia.git — clone copies a repository that already exists online. Here nothing is online yet: the project only lives on your disk.
- [ ] git add . — add prepares files for a snapshot, but without a repository there is no index and no snapshot: Git refuses.
- [ ] git commit -m "First commit" — commit stores a snapshot in .git; here there is no .git yet.

## Goal
A .git folder created: your files show up as U, the main lane waits for its first commit.

## Takeaway
git init turns an ordinary folder into a repository. git clone copies a repository that already exists somewhere else.
