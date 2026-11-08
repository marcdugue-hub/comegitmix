---
title: git pull
summary: Récupérer le travail en ligne et le faire entrer dans votre voie.
syntax: git pull [<dépôt>] [<branche>]
see: [fetch, merge, push]
---

## What it does

`git pull`, c'est deux commandes en une : un `git fetch` (télécharger ce qui est nouveau en ligne), puis un `git merge` (faire entrer cette version en ligne dans la voie où vous êtes).

C'est le geste du matin : avant de lancer une IA sur un nouveau sujet, vous mettez votre voie à jour avec ce que l'équipe a publié pendant la nuit.

## In the game

Les étiquettes en pointillé `origin/…` se mettent à jour, puis votre voie les rejoint dans **Les voies**. Si votre voie n'avait pas bougé, elle avance simplement jusqu'au bout de la version en ligne. Sinon, un commit de fusion apparaît. Les fichiers de votre dossier se mettent à jour.

Sans précision, pull utilise la voie en ligne que votre voie suit déjà (en général `origin/<même nom>`).

## Example

- `git pull` : mettre la voie courante à jour.
- `git pull upstream main` : récupérer le projet d'origine dans votre voie.
- `git push` : après le pull, votre envoi passera.

## Watch out

Si quelqu'un a changé **le même fichier** que vous, c'est un **conflit**, comme pour un merge : le fichier est marqué d'un **!**, vous choisissez quoi garder, puis `git add` et `git commit`. Et pull refuse de partir si vous n'êtes sur aucune voie, ou si une opération (fusion, rebase) est déjà en cours.
