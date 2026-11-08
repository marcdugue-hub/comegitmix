---
title: git push
summary: Envoyer les commits de votre voie en ligne, pour l'équipe.
syntax: git push [<dépôt>] [<branche>]
see: [pull, fetch, mr]
---

## What it does

Vos commits (les « photos » du projet) restent sur votre poste tant que vous ne les envoyez pas. `git push` les **publie** sur le dépôt en ligne, en général `origin` : l'équipe peut alors les voir, et une demande de fusion (MR) peut être ouverte.

Une IA qui a fini son travail sur sa voie fait la même chose : elle pousse sa voie, puis propose une MR.

## In the game

Dans la zone **Dans Git**, la carte **origin** se met à jour et l'étiquette en pointillé `origin/<voie>` rejoint le bout de votre voie dans **Les voies**. Si la voie n'existait pas encore en ligne, push la crée.

La première fois, `-u` (ou `--set-upstream`) indique à Git que votre voie **suit** désormais sa jumelle en ligne : les prochains `git pull` et `git push` sauront où aller sans qu'on le précise.

## Example

- `git push -u origin ia/resume` : publier la voie de l'IA pour la première fois.
- `git push` : envoyer les nouveaux commits.
- `git push --force` : écraser la version en ligne (à éviter).

## Watch out

Si quelqu'un a poussé avant vous, Git **refuse** : sinon, vous effaceriez son travail. La solution : `git pull`, puis `git push`. Le forçage (`--force`, `--force-with-lease`) passe outre, et le jeu vous prévient : ceux qui avaient l'ancienne version vont s'y perdre.
