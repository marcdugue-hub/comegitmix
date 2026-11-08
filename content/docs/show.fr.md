---
title: git show
summary: Ouvrir un commit pour voir ce qu'il a changé.
syntax: git show [<commit>]
see: [log, diff, blame]
---

## What it does

Un commit est une « photo » du projet, mais Git retient aussi **ce qui a changé** par rapport à la photo précédente. `git show` ouvre un commit : son message, son auteur, et les fichiers qu'il a modifiés, ligne par ligne.

Sans rien préciser, il montre le dernier commit de votre voie. C'est le réflexe après le passage d'une IA : « montre-moi ce que tu viens d'enregistrer ».

## In the game

Le terminal affiche le commit, puis la liste des fichiers changés avec leur lettre (**A** pour un fichier ajouté, **M** pour modifié, **D** pour supprimé). L'écran **diff** s'ouvre ensuite, pour comparer ce commit avec celui d'avant : les lignes retirées d'un côté, les lignes ajoutées de l'autre.

Le commit se désigne par son identifiant, comme `c7`, ou par le nom d'une voie (son dernier commit).

## Example

- `git show` : le dernier commit de votre voie.
- `git show c7` : un commit repéré dans `git log`.
- `git show ia/resume` : le dernier commit de l'IA.

## Watch out

Show ne change rien : c'est une commande pour regarder. Il montre un commit **déjà enregistré** ; pour vos changements pas encore commités, c'est `git diff`. Le tout premier commit n'a pas de prédécesseur : pas de comparaison à ouvrir.
