---
title: Annuler sans réécrire
type: choice
timer: 60
repos: [local]
---

## Prompt
Le dernier commit, déjà partagé, est faux. Annulez-le sans réécrire l'histoire.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work resume.md
git commit -m "erreur"
@remote origin
```

## Choices
- [x] git revert HEAD
- [ ] git reset --hard HEAD~1 — reset réécrit une histoire déjà partagée.
- [ ] git restore resume.md — restore agit sur le fichier, pas sur le commit.
- [ ] git commit --amend — amend réécrit le dernier commit.

## Goal
Un commit d'annulation ajouté après l'erreur.

## Takeaway
revert annule en avançant ; l'histoire garde la trace.
