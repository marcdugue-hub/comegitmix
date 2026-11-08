---
title: git fetch
summary: Regarder ce qui a changé en ligne, sans rien toucher chez vous.
syntax: git fetch [<dépôt>]
see: [pull, push, remote]
---

## What it does

Pendant que vous travaillez, Stéphane et ses IA envoient leur travail en ligne. Votre poste n'en sait rien tant que vous ne demandez pas. `git fetch` va chercher les nouveautés : il **télécharge** les commits (les « photos » du projet) et met à jour ce que votre dépôt sait de la version en ligne.

C'est une commande de curieux prudent : elle **ne modifie ni vos voies ni vos fichiers**. Vous regardez d'abord, vous décidez ensuite.

## In the game

Dans **Les voies**, des étiquettes en pointillé `origin/main`, `origin/ia/resume`… se placent sur les commits téléchargés. Elles montrent où en est la version en ligne. Vos propres voies et votre dossier ne bougent pas d'un pixel.

Sans nom, fetch interroge `origin`. Avec `--all`, il interroge tous les dépôts en ligne connus (origin et upstream).

## Example

- `git fetch` : quoi de neuf sur origin ?
- `git fetch upstream` : et sur le projet d'origine ?
- `git merge origin/main` : vous décidez de faire entrer la version en ligne dans votre voie.

## Watch out

Une voie que l'IA a seulement envoyée en ligne (par exemple pour une demande de fusion) n'existe pas sur votre poste : il faut un `git fetch` pour la voir et ouvrir son diff. Et si fetch n'a rien trouvé, c'est simplement que rien n'a changé en ligne.
