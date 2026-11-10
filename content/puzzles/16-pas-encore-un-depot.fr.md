---
title: Pas encore un dépôt
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
Votre dossier atelier-ia contient trois fichiers, mais git status répond « not a git repository ». Quelle commande en fait un dépôt Git, sans rien télécharger ?

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
```

## Choices
- [x] git init
- [ ] git clone https://github.com/demo/atelier-ia.git — clone copie un dépôt qui existe déjà en ligne. Ici, il n'y a encore rien en ligne : le projet n'existe que sur votre disque.
- [ ] git add . — add prépare des fichiers pour une photo, mais sans dépôt il n'y a ni index ni photo : Git refuse.
- [ ] git commit -m "Premier commit" — commit enregistre une photo dans le .git ; ici, il n'y a pas encore de .git.

## Goal
Un dossier .git créé : vos fichiers apparaissent en U, la voie main attend son premier commit.

## Takeaway
git init transforme un dossier ordinaire en dépôt. git clone, lui, copie un dépôt qui existe déjà ailleurs.
