---
title: git blame
summary: Savoir qui a écrit chaque ligne d'un fichier, et dans quel commit.
syntax: git blame <fichier>
see: [log, show, diff]
---

## What it does

Le nom fait peur (« blâmer »), mais l'intention est bienveillante : `git blame` affiche un fichier **ligne par ligne**, et en face de chaque ligne, le commit qui l'a écrite et son auteur.

C'est utile avant de modifier un passage qu'on ne comprend pas : qui l'a écrit, et pourquoi ? Quand une IA a rédigé une partie du document, blame dit exactement **laquelle**.

## In the game

Le terminal affiche chaque ligne du fichier, précédée du commit d'où elle vient et de la mention **IA** ou **Humain**. L'explication fait le compte : combien de lignes viennent de l'IA sur le total. Rien ne bouge dans la scène : blame regarde, il ne change rien.

## Example

- `git blame rapport.md` : qui a écrit quoi dans le rapport ?
- `git show c7` : ouvrir le commit d'une ligne qui vous intrigue.
- `git log` : replacer ce commit dans l'histoire de la voie.

## Watch out

Blame lit la version **du dernier commit**, pas celle de votre dossier : vos modifications en cours n'y apparaissent pas. Le fichier doit aussi avoir déjà été commité, sinon Git ne le connaît pas. Enfin, blame donne l'auteur d'une ligne, pas le coupable d'un problème : souvent, c'est une affaire d'équipe.
