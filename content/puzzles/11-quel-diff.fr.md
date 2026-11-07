---
title: Quel diff ?
type: choice
timer: 60
repos: [local]
---

## Prompt
Avant de valider, vous voulez relire exactement ce qui partira dans le prochain commit, ligne par ligne. Quelle commande ?

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
git add intro.md
```

## Choices
- [x] git diff --staged
- [ ] git diff — montre ce qui n'est pas encore préparé (plan.md), donc l'inverse.
- [ ] git status — donne la liste des fichiers, pas leur contenu.
- [ ] git log — raconte le passé, pas ce qui va partir.

## Goal
L'écran de diff ouvert en mode « préparé ».

## Takeaway
git diff --staged : la relecture de ce qui est préparé.
