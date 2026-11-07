---
title: Ranger un fichier dans la photo
type: choice
timer: 60
repos: [local]
---

## Prompt
Vous voulez que seul intro.md parte dans le prochain commit.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
```

## Choices
- [x] git add intro.md
- [ ] git add . — git add . prépare tous les fichiers, plan.md compris.
- [ ] git commit -am "intro" — -a enregistre aussi plan.md.
- [ ] git restore intro.md — restore annule vos modifications.

## Goal
intro.md préparé, plan.md toujours en M.

## Takeaway
add choisit fichier par fichier ce qui entre dans la photo.
