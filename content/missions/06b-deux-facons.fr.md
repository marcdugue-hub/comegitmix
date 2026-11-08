---
title: Deux façons de relire une MR
mode: compare
---

La même MR !42, relue deux fois. Ce qui change : ce qui arrive à votre bureau pendant la revue.

## Column — Sur une branche
replays: 06-relire-une-mr part A
desk: intact, stashed, stashed, changed, changed, changed, restored

## Column — Dans un worktree
replays: 06-relire-une-mr part B
desk: intact, intact, intact, intact, intact, intact

## Quand choisir quoi ?
**Sur une branche** : pour un coup d'œil rapide, quand vous n'avez rien en cours.
**Dans un worktree** : dès que vous avez du travail en cours, que la revue dure, ou que plusieurs MR attendent (un dossier par MR).

## Piège
`fatal: 'ia/graphiques' is already used by worktree at '…/rpt-ia-graphiques'`
Une branche ne peut être ouverte que dans un seul dossier à la fois. Si l'assistant l'a déjà ouverte dans son bureau, allez relire dans ce bureau (`git worktree list` vous dit lequel).

## MR ou PR ?
Merge request (GitLab) et pull request (GitHub) : deux noms pour la même chose, une demande de fusion qui attend sa relecture.
