---
title: git rebase
summary: Rejouer vos commits ailleurs, ou les remettre au propre avant de les montrer.
syntax: git rebase <branche>
see: [merge, cherry-pick, log, reset]
---

## What it does

`git rebase` a deux usages.

**Repartir d'ailleurs.** Votre IA a commencé sa voie (sa **branche**) lundi ; depuis, `main` a avancé. `git rebase main` reprend ses commits (ses « photos » du projet) un par un et les rejoue au bout de `main`, comme si elle avait commencé aujourd'hui. L'historique devient une ligne droite.

**Faire le ménage.** `git rebase -i HEAD~3` (i pour « interactif ») ouvre la liste de vos 3 derniers commits. Pour chacun, vous choisissez : le **garder** (pick), le **renommer** (reword), le **fondre** dans le précédent (squash), ou le **retirer** (drop). Vous pouvez aussi changer leur ordre. Pratique quand une IA a fait douze commits « wip » pour une seule idée.

## In the game

Dans **Les voies**, les commits rejoués réapparaissent au bout de l'autre voie, avec de nouveaux numéros. Avec `-i`, un panneau s'ouvre : une ligne par commit, du plus ancien au plus récent, un menu pour l'action et des flèches pour réordonner. Le jeu n'accepte qu'une voie droite, sans commit de fusion.

## Example

- `git rebase main` : la voie courante repart du bout de `main`.
- `git rebase -i HEAD~4` : regrouper ou nettoyer les 4 derniers commits.
- `git rebase --continue` / `--abort` : après un conflit, poursuivre ou tout annuler.

## Watch out

Le rebase fabrique de **nouveaux** commits. Si Stéphane travaille déjà sur cette voie, il garde les anciens et tout se mélange. Règle simple : on rebase sa propre voie, jamais une voie partagée.
