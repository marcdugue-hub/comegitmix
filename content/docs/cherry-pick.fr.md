---
title: git cherry-pick
summary: Recopier un seul commit d'une autre voie sur la vôtre.
syntax: git cherry-pick <commit>
see: [merge, rebase, log, revert]
---

## What it does

Parfois on ne veut pas tout le travail d'une voie (une **branche**), seulement un morceau. Une IA a passé la matinée sur sa voie : une refonte douteuse, et au milieu, une correction de faute parfaite. `git cherry-pick` va « cueillir la cerise » : il recopie ce seul commit (cette « photo » du projet) sur la voie où vous êtes.

La copie contient les mêmes changements et le même message, mais c'est un **nouveau** commit, avec un nouveau numéro. L'original reste à sa place sur l'autre voie.

## In the game

Dans **Les voies**, un nouveau commit apparaît au bout de votre voie : la copie de celui que vous avez nommé. Les fichiers de votre dossier se mettent à jour. Vous pouvez aussi cliquer sur un commit et choisir « Le recopier ici ».

Le jeu refuse de copier un commit de fusion, et vous prévient si les changements sont déjà sur votre voie : il n'y a alors rien à copier.

## Example

- `git log ia/resume` : repérer le commit qui vous intéresse.
- `git cherry-pick c7` : le recopier sur votre voie.
- `git cherry-pick --abort` : en cas de conflit, tout revient comme avant.

## Watch out

Si le fichier a aussi changé chez vous, c'est un **conflit** : le fichier est marqué d'un **!**. Choisissez la version à garder, puis `git add` et `git commit` (ou `git cherry-pick --continue`). Et si la voie entière vous intéresse, préférez `git merge` : cueillir dix cerises une à une, c'est long.
