---
title: git init
summary: Transformer un dossier ordinaire en dépôt Git.
syntax: git init
see: [add, commit, gh, remote]
---

## What it does

Un dossier de votre disque n'est pas un dépôt Git tant qu'on ne l'a pas dit à Git. `git init` crée, dans ce dossier, un sous-dossier caché nommé **.git** : c'est la mémoire du projet, l'endroit où Git rangera toutes les photos (les commits), les voies et le stash.

Vos fichiers ne bougent pas et ne sont pas encore enregistrés : Git les voit, mais ne les suit pas encore. Il faut ensuite `git add` puis `git commit` pour prendre la première photo.

## In the game

Avant `git init`, la carte du haut dit « Pas encore de dépôt Git » et toutes les commandes git répondent « not a git repository ». Après, la carte **Dépôt local · .git** apparaît, vos fichiers prennent la lettre **U** (pas encore suivis) et la voie **main** attend son premier commit.

Le départ « Sans Git » du bac à sable et la mission 8 partent d'un tel dossier.

## Example

- `git status` : refusé, pas de dépôt ici.
- `git init` : le dossier .git est créé.
- `git add .` puis `git commit -m "Premier commit"` : la première photo.

## Watch out

`git init` ne se tape qu'une fois par projet, dans le dossier du projet. Pour récupérer un projet qui existe déjà en ligne, on ne fait pas `git init` mais `git clone`, qui copie le dépôt entier. Les versions anciennes de Git appellent la première voie `master` au lieu de `main`.
