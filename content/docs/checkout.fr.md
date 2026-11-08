---
title: git checkout
summary: L'ancienne commande à tout faire, aujourd'hui remplacée par switch et restore.
syntax: git checkout <branche>
see: [switch, restore, branch]
---

## What it does

`git checkout` est le couteau suisse historique de Git. Selon ce qu'on lui donne, il fait des choses très différentes :

- avec un nom de voie (une **branche**), il vous place sur cette voie ;
- avec `-b`, il crée une nouvelle voie et vous y place ;
- avec un nom de fichier, il **efface vos changements** sur ce fichier pour revenir à la dernière version enregistrée.

Une seule commande pour « changer de voie » et « jeter mon travail », c'était un peu risqué. Git l'a donc coupée en deux : `git switch` pour changer de voie, `git restore` pour les fichiers. Vous croiserez encore `checkout` partout, dans les tutoriels comme chez les IA.

## In the game

La commande fonctionne, mais le jeu vous glisse à chaque fois la version moderne : « aujourd'hui on écrit git switch ... » ou « git restore ... ». La scène réagit exactement comme avec ces deux commandes : la voie active change dans **Les voies**, ou le fichier perd sa lettre **M**.

Donnez-lui un numéro de commit au lieu d'une voie, et vous voilà sur ce commit sans voie : Git appelle ça une « HEAD détachée ».

## Example

- `git checkout main` : comme `git switch main`.
- `git checkout -b ia/resume` : comme `git switch -c ia/resume`.
- `git checkout -- rapport.md` : comme `git restore rapport.md`.

## Watch out

`git checkout <fichier>` jette vos changements sans demander confirmation. Si une IA vous propose cette commande, vérifiez qu'elle parle bien d'un fichier dont vous ne voulez plus les modifications.
