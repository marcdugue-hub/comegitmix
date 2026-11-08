---
title: Demande de fusion (MR)
summary: Proposer à l'équipe de faire entrer une voie, après relecture.
syntax: glab mr create --fill
see: [push, merge, fork]
---

## What it does

Une demande de fusion (« merge request », MR) n'est **pas une commande Git** : c'est une page du site d'hébergement (GitLab). Une IA a fini son travail sur sa voie ; plutôt que de fusionner elle-même, elle **propose** : « voici ma voie, puis-je rejoindre `main` ? ». L'équipe relit, commente, puis décide. Chaque MR porte un numéro, comme `!42`.

On peut tout faire en cliquant sur le site, ou depuis le terminal avec **glab**, l'outil en ligne de commande de GitLab :

- `glab mr create` : ouvrir une MR pour la voie où vous êtes ;
- `glab mr list` et `glab mr view 42` : voir les MR en cours ;
- `glab mr approve 42` : approuver ;
- `glab mr merge 42` : fusionner ;
- `glab mr close 42` : abandonner.

## In the game

La MR apparaît sur la carte **origin**, dans la zone **Dans Git**, avec son état : **Ouverte**, **Approuvée**, **Fusionnée** ou **Fermée**. Tapez les commandes `glab`, utilisez les boutons de la palette, ou cliquez sur la carte de la MR : le jeu affiche toujours la commande `glab` correspondante. Depuis la carte, « Voir le diff » montre ce que la MR change.

## Example

- `glab mr create --fill` : envoie la voie en ligne si besoin, puis ouvre la MR avec le message du dernier commit comme titre.
- `glab mr create -t "Résumé prêt"` : même chose avec votre titre (la voie doit déjà être en ligne : `git push -u origin <branche>`).
- `glab mr approve 42`, puis `glab mr merge 42` : vous relisez, vous acceptez.
- `git pull` : votre poste récupère le résultat.

## Watch out

Dans le jeu, pas de fusion sans approbation (beaucoup d'équipes l'imposent aussi). Une fois fusionnée en ligne, **vos voies locales n'ont pas bougé** : il faut un `git pull`. Si les deux côtés ont changé le même fichier, le site refuse de fusionner.

Sur GitHub, la même chose s'appelle une « pull request », et l'outil s'appelle `gh` : `gh pr create`, `gh pr merge`.
