---
title: git switch
summary: Faire passer votre dossier sur une autre voie.
syntax: git switch <branche>
see: [branch, stash, worktree, checkout]
---

## What it does

`git switch` change la voie (la **branche**) sur laquelle travaille votre dossier. Les fichiers du dossier se transforment pour correspondre au dernier **commit** (la dernière photo) de cette voie. Vos prochains commits s'ajouteront à elle.

C'est le même bureau, mais vous avez changé de dossier posé dessus.

## In the game

L'étiquette de votre bureau, dans **Sur votre poste**, affiche la nouvelle voie, et ses fichiers se mettent à jour.

- `git switch <branche>` : passe sur une voie existante.
- `git switch -c <branche>` : crée la voie et y va, en un seul geste.
- `git switch --detach <commit>` : va regarder une ancienne photo, sans voie.

Si la voie n'existe qu'en ligne (`origin/<branche>`), le jeu en crée une copie locale et l'ouvre.

## Example

L'IA a fini son travail sur `ia/resume` ; vous voulez le relire :

- `git switch ia/resume` : le dossier montre son travail.
- `git switch main` : retour à la version de référence.

## Watch out

Vos changements non enregistrés vous suivent d'une voie à l'autre. Si l'autre voie a modifié les mêmes fichiers, Git refuse pour ne rien écraser : faites un `git commit` ou un `git stash` d'abord.

Une voie ne peut être ouverte que dans un seul dossier à la fois. Si une IA l'occupe dans son propre dossier (`git worktree`), laissez-la finir.
