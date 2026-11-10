---
title: Tout dans la première photo
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
git init vient de créer le dépôt. Les trois fichiers sont en U. Préparez-les tous pour la première photo, en une commande.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
```

## Choices
- [x] git add .
- [ ] git add README.md — seul le README partirait dans la photo ; le programme et les inscrits resteraient en U.
- [ ] git commit -m "Premier commit" — rien n'est encore dans l'index : Git n'a rien à photographier.
- [ ] git init — le dépôt existe déjà ; git init ne prépare aucun fichier.

## Goal
README.md, programme.md et inscrits.csv dans l'index, en A, prêts pour le premier commit.

## Takeaway
Le point de git add . veut dire « tout le dossier » : pratique pour la toute première photo, à manier avec soin ensuite.
