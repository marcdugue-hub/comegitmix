---
title: git stash
summary: Mettre le travail en cours de côté, le temps de faire autre chose.
syntax: git stash
see: [switch, restore, worktree]
---

## What it does

Vous êtes en plein travail, rien n'est prêt à être enregistré, et une urgence tombe. `git stash` range vos changements dans **la remise** (le *stash*) : un placard où ils attendent, sans **commit** (sans photo officielle). Le dossier redevient propre, identique à la dernière photo.

Plus tard, vous ressortez le tout et reprenez là où vous en étiez.

## In the game

Dans le jeu, chaque dossier a sa remise (dans le vrai Git, une seule remise est partagée par tous les dossiers du projet). Elle apparaît dans la zone **L'index**, au bout de la bande du bureau, avec le nombre d'entrées rangées.

- `git stash` : met de côté les fichiers modifiés et préparés.
- `git stash pop` : les ressort et vide l'entrée de la remise.
- `git stash apply` : en ressort une copie ; l'entrée reste rangée.
- `git stash list` : montre ce qui est rangé.
- `git stash drop` : jette la dernière entrée.

## Example

Stéphane a besoin d'une correction immédiate sur `main`, mais votre dossier est en chantier :

1. `git stash` : le chantier part dans la remise.
2. `git switch main`, la correction, `git commit`.
3. `git switch` sur votre voie, puis `git stash pop` : le chantier revient.

## Watch out

Les fichiers nouveaux (**U**), jamais ajoutés avec `git add`, ne partent pas dans la remise : ils restent dans le dossier.

Si le même fichier a changé entre-temps, ressortir la remise crée un **conflit** (**!**) : choisissez la version à garder. L'entrée reste alors dans la remise, par sécurité.

La remise, c'est pour quelques minutes. Pour un vrai second chantier, préférez une voie ou un deuxième dossier (`git worktree`).
