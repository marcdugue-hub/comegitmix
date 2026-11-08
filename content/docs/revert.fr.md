---
title: git revert
summary: Annuler un commit en ajoutant un commit qui fait l'inverse.
syntax: git revert <commit>
see: [reset, commit, log, push]
---

## What it does

Un commit (une « photo » du projet) a introduit une erreur, et il est déjà partagé : Stéphane l'a récupéré, la demande de fusion (MR) est passée. Pas question de réécrire l'histoire. `git revert` fait la chose polie : il fabrique un **nouveau commit** qui défait exactement les changements de l'ancien. Ce qui avait été ajouté est retiré, ce qui avait été retiré revient.

L'erreur et sa correction restent toutes les deux dans l'historique. Rien n'est effacé, rien n'est réécrit : tout le monde peut récupérer l'annulation comme n'importe quel autre commit.

## In the game

Dans **Les voies**, un nouveau commit apparaît au bout de votre voie, avec un message « Annule ... ». L'ancien commit reste en place. Les changements de ce commit disparaissent des fichiers de votre dossier. Vous pouvez aussi cliquer sur un commit et choisir « Annuler ce commit ».

Le jeu n'annule que des commits ordinaires, pas les commits de fusion.

## Example

- `git log` : retrouver le commit fautif.
- `git revert c7` : ajouter le commit qui l'annule.
- `git push` : partager l'annulation.
- `git revert --abort` : en cas de conflit, tout revient comme avant.

## Watch out

Si le fichier a changé depuis ce commit, Git peut ne pas savoir quoi défaire : c'est un **conflit**, marqué d'un **!**. Choisissez la version à garder, puis `git add` et `git commit`. Et ne confondez pas avec `git reset`, qui recule la voie au lieu d'ajouter un commit.
