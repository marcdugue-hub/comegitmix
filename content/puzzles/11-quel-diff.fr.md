---
title: Quel diff ?
type: choice
timer: 60
repos: [local]
---

## Prompt
Quelle commande montre exactement ce qui partira dans le prochain commit ?

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md plan.md
git add intro.md
```

## Choices
- [x] git diff --staged
- [ ] git diff — montre ce qui n'est pas encore préparé (plan.md).
- [ ] git status — liste les fichiers, sans les lignes.
- [ ] git log — montre l'histoire passée.

## Goal
L'écran de diff ouvert en mode « préparé ».

## Takeaway
git diff --staged = ce qui est dans l'index.
