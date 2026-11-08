---
title: git log
summary: L'historique d'une voie, du commit le plus récent au plus ancien.
syntax: git log [<voie>]
see: [show, blame, diff]
---

## What it does

Chaque commit est une « photo » du projet, avec un message, une date et un auteur. `git log` les déroule comme un album, **du plus récent au plus ancien**, en remontant la voie où vous êtes.

C'est la première chose à regarder quand on se demande « qu'est-ce qui s'est passé ici ? », surtout après une matinée où trois IA ont travaillé en parallèle.

## In the game

L'écran **Historique** s'ouvre : la liste des commits de la voie, chacun avec son message, le nombre de fichiers touchés et son auteur. Les commits de l'IA sont **marqués**, pour toujours savoir qui a fait quoi. Les commits de fusion sont signalés aussi. Le terminal affiche la même liste, une ligne par commit.

Avec un nom de voie, vous lisez l'historique d'une autre voie sans y aller.

## Example

- `git log` : l'histoire de la voie courante.
- `git log ia/resume` : ce que l'IA a fait sur sa voie.
- `git show c7` : ouvrir un commit de la liste pour voir ce qu'il a changé.

## Watch out

Le log ne montre que les commits **enregistrés**. Vos fichiers modifiés mais pas encore commités (lettres **M** ou **U**) n'y figurent pas : pour eux, c'est `git status`. Et un projet tout neuf, sans aucun commit, a un historique vide.
