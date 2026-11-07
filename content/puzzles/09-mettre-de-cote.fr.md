---
title: Mettre ses modifications de côté
type: choice
timer: 60
repos: [local]
---

## Prompt
Vous devez changer de branche mais intro.md n'est pas prêt. Mettez-le de côté sans l'enregistrer.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
```

## Choices
- [x] git stash
- [ ] git commit -am "wip" — vous enregistrez un travail non prêt.
- [ ] git restore intro.md — vous perdez vos modifications.
- [ ] git add intro.md — l'index n'est pas une cachette.

## Goal
Dossier propre, une entrée dans le stash.

## Takeaway
stash range le travail en cours ; stash pop le ressort.
