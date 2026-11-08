---
title: git merge
summary: Faire entrer le travail d'une autre voie dans la vôtre.
syntax: git merge <branche>
see: [rebase, switch, mr]
---

## What it does

Vous avez demandé à une IA de travailler sur sa propre voie (une **branche**), à l'écart. Son travail est prêt : `git merge` le fait entrer dans la voie où vous êtes.

On fusionne toujours **vers soi** : on se place d'abord sur la voie qui doit recevoir le travail (souvent `main`, la version de référence), puis on nomme celle qu'on veut rapatrier.

## In the game

Dans la zone **Les voies**, la voie fusionnée rejoint la vôtre par une courbe, et un nouveau commit (un « commit de fusion ») apparaît au point de rencontre. Les fichiers de votre dossier se mettent à jour.

Si votre voie n'avait pas bougé entre-temps, Git ne crée même pas de commit de fusion : il fait simplement **avancer** votre voie jusqu'au bout de l'autre (une « avance rapide »).

## Example

- `git switch main` : on se place sur la voie qui reçoit.
- `git merge ia/resume` : le travail de l'IA entre dans `main`.
- `git merge --abort` : en cas de conflit, tout revient comme avant.

## Watch out

Si les deux voies ont changé **le même fichier**, Git ne choisit pas à votre place : c'est un **conflit**. Le fichier est marqué d'un **!**, vous choisissez la version à garder (la vôtre, l'autre ou les deux), puis `git add` et `git commit` terminent la fusion. Rien n'est perdu tant que vous n'avez pas tranché.
