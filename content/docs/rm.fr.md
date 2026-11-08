---
title: git rm
summary: Supprimer un fichier et préparer cette suppression pour le prochain commit.
syntax: git rm <fichier>
see: [add, commit, restore]
---

## What it does

Supprimer un fichier, c'est aussi un changement à enregistrer. Si vous effacez un fichier du dossier, Git le remarque, mais il attend que vous confirmiez.

`git rm` fait les deux gestes d'un coup : il efface le fichier du dossier **et** met cette suppression dans **l'index** (la liste de ce que le prochain commit enregistrera). Au prochain **commit** (la prochaine photo du projet), le fichier ne sera plus là.

Les anciennes photos, elles, le gardent : rien n'est perdu pour de bon.

## In the game

Deux façons de faire :

- `rm <fichier>` : la commande ordinaire de l'ordinateur. Le fichier disparaît du dossier et Git le marque **D** (supprimé). Il faut ensuite `git add` puis `git commit` pour enregistrer la suppression.
- `git rm <fichier>` : le fichier est supprimé et la suppression est déjà préparée. Il ne reste que le `git commit`.

Avec `rm`, un fichier nouveau (**U**), que Git n'a jamais enregistré, disparaît simplement : il n'y a rien à enregistrer.

## Example

L'IA a laissé traîner un brouillon, `notes-ia.md`, qui n'a rien à faire dans le projet :

- `git rm notes-ia.md`
- `git commit -m "Retire les notes de travail de l'IA"`

## Watch out

Effacer un fichier en conflit (**!**) n'est pas une façon de régler le conflit : le jeu vous demande d'abord de choisir la version à garder.

Changé d'avis avant le commit ? `git restore --staged <fichier>` puis `git restore <fichier>` le ramènent.
