---
title: git reset
summary: Faire reculer votre voie jusqu'à un commit plus ancien.
syntax: git reset <commit>
see: [revert, restore, stash, log]
---

## What it does

Votre voie (votre **branche**) est une étiquette posée sur son dernier commit, sa dernière « photo » du projet. `git reset` **recule cette étiquette** vers un commit plus ancien. Les commits qui suivaient ne font plus partie de la voie.

Reste à savoir ce que deviennent leurs changements. Trois réglages :

- `--soft` : ils restent dans **l'index** (la liste de ce que le prochain commit enregistrera), prêts à être réenregistrés en un seul commit ;
- `--mixed` (par défaut) : ils restent dans vos fichiers, marqués **M**, mais l'index est vidé ;
- `--hard` : ils sont **jetés**, fichiers compris.

Utilisé avec un nom de fichier, `git reset <fichier>` fait tout autre chose : il retire juste ce fichier de l'index, comme `git restore --staged`.

## In the game

Dans **Les voies**, l'étiquette de la voie recule. Selon le réglage, les changements apparaissent dans **L'index**, dans **Sur votre poste** avec la lettre **M**, ou disparaissent. Dans la palette, le jeu vous demande : « Que deviennent les changements ? ». Vous pouvez aussi cliquer sur un commit et choisir « Revenir ici ».

## Example

- `git reset HEAD~1` : annuler le dernier commit, garder son travail dans les fichiers.
- `git reset --soft HEAD~3` : défaire les 3 derniers commits pour les refaire en un.
- `git reset --hard main` : tout remettre comme sur `main`.

## Watch out

`--hard` efface sans corbeille. Et sur une voie que Stéphane a déjà récupérée, reculer réécrit l'histoire sous ses pieds : préférez `git revert`.
