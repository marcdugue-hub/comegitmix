---
title: git worktree
summary: Ouvrir un deuxième dossier sur le même projet, pour qu'une autre IA y travaille.
syntax: git worktree add ../<dossier> -b <branche>
see: [cd, branch, switch, mr]
---

## What it does

Un dossier de travail ne peut afficher qu'une voie (une **branche**) à la fois. Si deux IA travaillent dans le même dossier, elles se marchent dessus. `git worktree` règle ça : il ouvre un **autre dossier**, à côté, sur sa propre voie. Chaque dossier a ses fichiers et son **index** (la liste de ce que le prochain commit enregistrera), mais il n'y a qu'**un seul .git** : la mémoire du projet est partagée.

- `add` ouvre un nouveau dossier ;
- `list` montre tous les dossiers et leur voie ;
- `remove` ferme un dossier.

## In the game

Chaque dossier est un bureau dans **Sur votre poste**. Après `add`, le nouveau bureau apparaît et devient actif : il est affiché à 100 %, les autres s'estompent à 60 %. Toutes les commandes agissent ensuite sur ce bureau. Une nouvelle voie apparaît aussi dans **Les voies**. Pour changer de bureau, utilisez `cd`.

## Example

- `git worktree add ../ia-resume -b ia/resume` : un bureau pour l'IA qui rédige le résumé.
- `git worktree add ../ia-chiffres -b ia/chiffres` : un autre pour celle qui vérifie les chiffres.
- `git worktree list` : qui travaille où.
- `git worktree remove ../ia-resume` : le travail est fusionné, on range le bureau.

## Watch out

Une voie ne peut être ouverte que dans **un seul** dossier à la fois. `remove` refuse de fermer un dossier qui contient des changements non enregistrés (sauf avec `--force`, qui les jette), et le dossier d'origine, qui contient le .git, ne se ferme pas. Fermer un dossier ne supprime pas sa voie : ses commits restent dans le .git.
