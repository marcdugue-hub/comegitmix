---
title: git commit
summary: Prendre une photo du projet et l'ajouter à votre voie.
syntax: git commit -m "<message>"
see: [add, status, log, revert]
---

## What it does

Un **commit**, c'est une photo du projet à un instant donné, avec une petite légende (le message) qui dit ce qui a changé et pourquoi. Git garde toutes les photos : on peut toujours revenir voir, comparer ou annuler.

La photo ne prend pas tout le dossier : elle prend **l'index**, c'est-à-dire ce que vous avez préparé avec `git add`. Le reste attend son tour.

## In the game

Un nouveau point apparaît au bout de votre voie (votre **branche**), dans la zone **Les voies**. L'index se vide : tout ce qui était préparé est maintenant enregistré.

- `git commit -m "message"` : la forme normale.
- `git commit -am "message"` : prépare d'abord les fichiers **modifiés** (pas les nouveaux), puis prend la photo.
- `git commit --amend` : refait la dernière photo avec le contenu actuel ; l'ancienne disparaît de la voie.

Sans message, ou sans rien de préparé, le jeu refuse et vous explique pourquoi.

## Example

L'IA a rédigé le résumé, vous l'avez relu :

- `git add resume.md`
- `git commit -m "Ajoute le résumé du rapport"`

## Watch out

Le message est pour Stéphane, pour vous dans six mois, et pour l'IA qui passera derrière. « Modifs » ne dit rien ; « Corrige le total du devis » dit tout.

N'utilisez `--amend` que sur une photo que personne n'a encore récupérée : la refaire change son identité, et ceux qui avaient l'ancienne s'y perdraient.
