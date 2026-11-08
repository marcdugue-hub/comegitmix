---
title: git diff
summary: Voir ligne par ligne ce qui a changé, sans rien modifier.
syntax: git diff
see: [status, add, mr, show]
---

## What it does

`git status` vous dit **quels** fichiers ont changé ; `git diff` vous montre **quoi** dans ces fichiers. Les lignes retirées sont en rouge, les lignes ajoutées en vert. On ne fait que regarder : rien n'est modifié.

Trois questions, trois façons de l'utiliser :

- `git diff` : mes changements pas encore ajoutés à **l'index** (la liste de ce que le prochain commit enregistrera) ;
- `git diff --staged` : ce qui est dans l'index, donc exactement ce que le prochain commit contiendra ;
- `git diff main ia/resume` : la différence entre deux voies (deux **branches**).

C'est le meilleur réflexe avant d'accepter le travail d'une IA : lire ce qu'elle a vraiment changé, pas seulement ce qu'elle dit avoir fait.

## In the game

Un écran « Le diff » s'ouvre, avec ses trois onglets : « Mes changements », « Préparé » et « Entre deux voies ». Deux affichages au choix : « Côte à côte » (avant à gauche, après à droite) ou « Unifié » (tout dans une seule colonne). Vous pouvez aussi ouvrir le diff d'un fichier depuis l'arborescence de votre bureau.

## Example

- `git diff rapport.md` : seulement ce fichier.
- `git diff --staged` : relire avant `git commit`.
- `git diff main...ia/resume` : avec trois points, seulement ce que la voie de l'IA apporte depuis qu'elle a quitté `main`. C'est ce que montre une demande de fusion (MR).

## Watch out

Un fichier nouveau (lettre **U**) n'apparaît pas dans `git diff` : Git ne le suit pas encore. Faites `git add`, puis `git diff --staged`.
