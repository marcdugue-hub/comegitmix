---
title: Demande de fusion (MR)
summary: Proposer à l'équipe de faire entrer une voie, après relecture.
syntax: (site) Approuver la MR, puis Fusionner
see: [push, merge, fork]
---

## What it does

Une demande de fusion (« merge request », MR) n'est **pas une commande Git** : c'est une page du site d'hébergement (GitLab). GitHub appelle la même chose une « pull request ».

Une IA a fini son travail sur sa voie et l'a poussée en ligne. Plutôt que de fusionner elle-même, elle **propose** : « voici ma voie, puis-je rejoindre `main` ? ». L'équipe relit, commente, puis décide. Chaque MR porte un numéro, comme `!42`.

## In the game

La MR apparaît sur la carte **origin**, dans la zone **Dans Git**, avec son état. Elle passe par quatre étapes :

1. **Ouverte** : la voie demande à entrer (souvent, c'est l'IA qui l'ouvre).
2. **Approuvée** : quelqu'un a relu et dit « ça peut entrer ».
3. **Fusionnée** : la fusion se fait en ligne, sur origin.
4. Ou **Fermée** : abandonnée sans fusion.

Les boutons « approuver la MR » et « fusionner la MR » de la palette, ou un clic sur la carte de la MR, font ces gestes. Depuis la carte, « Voir le diff » montre ce qu'elle change.

## Example

- `approve MR !42` : vous approuvez sur le site.
- `merge MR !42` : vous fusionnez sur le site.
- `git pull` : votre poste récupère le résultat.

## Watch out

Pas de fusion sans approbation. Et une fois fusionnée en ligne, **vos voies locales n'ont pas bougé** : il faut un `git pull`. Si les deux côtés ont changé le même fichier, le site refuse de fusionner.
