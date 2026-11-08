---
title: cd
summary: Passer d'un dossier à un autre. Ce n'est pas une commande Git.
syntax: cd ../<dossier>
see: [worktree, status, branch]
---

## What it does

`cd` (pour « change directory », changer de dossier) n'est **pas une commande Git** : c'est une commande du terminal, la fenêtre où l'on tape les commandes. Elle vous déplace d'un dossier à un autre, comme double-cliquer sur un dossier dans l'explorateur de fichiers.

Le `../` veut dire « remonter d'un cran, puis entrer dans ». Avec `git worktree`, chaque IA a son dossier, rangé à côté des autres : `cd ../ia-resume` sort du dossier actuel et entre dans celui de l'IA.

Sa petite sœur `ls` (pour « list ») affiche ce que contient le dossier où vous êtes.

## In the game

Chaque dossier est un bureau dans **Sur votre poste**. Après `cd`, le bureau choisi passe à 100 % et les autres s'estompent à 60 %. Toutes les commandes Git que vous tapez ensuite agissent sur ce bureau, sa voie et son index. Vous pouvez aussi cliquer sur un bureau et choisir « Travailler dans ... ».

`ls` liste les fichiers et sous-dossiers du bureau actif, sans rien changer.

## Example

- `git worktree list` : voir les dossiers ouverts.
- `cd ../ia-resume` : aller voir ce que fait l'IA du résumé.
- `ls` : jeter un œil à ses fichiers.
- `git status` : savoir où elle en est.

## Watch out

Avant de taper une commande, vérifiez **où vous êtes**. Un `git commit` tapé dans le mauvais dossier enregistre sur la mauvaise voie. C'est l'erreur la plus courante quand plusieurs IA travaillent en parallèle.
