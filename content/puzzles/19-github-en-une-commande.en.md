---
title: GitHub in one command
type: typed
repos: [local]
folder: atelier-ia
---

## Prompt
Your atelier-ia repository has its first commit, and nothing exists on GitHub yet. In one single gh command: create the public repository on GitHub, link it under the name origin from the current folder, and push main there.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "First commit"
```

## Solution
solution: gh repo create atelier-ia --public --source=. --push
check:
- main = origin/main

## Goal
The repository exists on GitHub, linked under the name origin, and origin/main is up to date.

## Takeaway
gh repo create --source=. --push does three things at once: create the online repository, link it (git remote add) and send (git push -u). The long way is still useful to understand what happens.
