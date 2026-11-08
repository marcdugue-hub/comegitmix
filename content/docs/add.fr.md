---
title: git add
summary: Choisir ce qui partira dans la prochaine photo du projet.
syntax: git add <fichier>
see: [commit, status, restore]
---

## What it does

Avant d'enregistrer, on choisit. `git add` met un fichier dans **l'index** : la liste de ce que le prochain **commit** (la prochaine photo du projet) enregistrera.

C'est comme préparer un colis : vous y mettez ce qui doit partir, et vous laissez le reste sur la table. Le fichier n'est pas encore enregistré, il est seulement **préparé**.

## In the game

- `git add <fichier>` : un seul fichier.
- `git add <dossier>` : tout ce qu'il contient.
- `git add .` ou `git add -A` : tout ce qui a changé dans le dossier.

Le fichier apparaît dans la zone **L'index**, sur la bande de votre bureau. Un fichier nouveau passe de **U** à **A** ; un fichier modifié garde son **M**, mais marqué comme préparé. Si rien n'avait changé, le jeu vous le dit : il n'y a rien à préparer.

## Example

Une IA a corrigé `devis.md` et, au passage, a aussi « amélioré » `contrat.md`. Vous ne voulez garder que la première correction :

- `git add devis.md` : seul le devis est préparé.
- `git commit -m "Corrige le devis"` : la photo ne contient que lui.

## Watch out

L'index retient le fichier **tel qu'il était** au moment du `git add`. Si vous le modifiez ensuite, il faut refaire `git add` pour que la nouvelle version parte.

Un fichier en conflit (**!**) ne peut pas être ajouté tant que vous n'avez pas choisi la version à garder. Une fois le choix fait, `git add` confirme ce choix.
