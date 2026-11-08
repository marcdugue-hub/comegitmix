---
title: git branch
summary: Créer, lister ou supprimer des voies, sans changer de place.
syntax: git branch <nom>
see: [switch, merge, worktree]
---

## What it does

Une **branche**, c'est une voie de travail : une suite de **commits** (de photos du projet) qui avance à part, sans déranger les autres. On en ouvre une par sujet : une pour le résumé, une pour les chiffres, une pour l'essai un peu risqué de l'IA.

`git branch <nom>` crée la voie à l'endroit où vous êtes. Attention, il ne vous y emmène pas : vous restez sur votre voie actuelle.

## In the game

Une nouvelle voie se détache de votre commit actuel dans la zone **Les voies**, avec son nom.

- `git branch` : liste toutes les voies ; une étoile marque la vôtre.
- `git branch <nom> <commit>` : fait partir la voie d'un autre point.
- `git branch -d <nom>` : supprime une voie dont le travail est déjà fusionné.
- `git branch -D <nom>` : supprime même si le travail n'est fusionné nulle part.

## Example

Vous confiez deux sujets à deux IA :

- `git branch ia/resume`
- `git branch ia/chiffres`

Chacune aura sa voie ; `main` reste tranquille.

## Watch out

Pour créer une voie **et** y aller, c'est `git switch -c <nom>`. On l'oublie souvent : on crée la voie, puis on travaille… sur l'ancienne.

`-D` efface du travail non fusionné : ses commits s'effacent avec la voie. Et une voie ouverte dans un dossier ne peut pas être supprimée tant qu'elle sert.
