---
title: git restore
summary: Annuler les changements d'un fichier, ou le sortir de l'index.
syntax: git restore <fichier>
see: [add, status, reset, stash]
---

## What it does

`git restore` fait marche arrière sur un fichier, avant même d'avoir pris la photo. Il a deux usages :

- `git restore <fichier>` : le fichier revient à sa dernière version enregistrée. Les changements faits dans le dossier sont **jetés**.
- `git restore --staged <fichier>` : le fichier sort de **l'index** (la liste de ce que le prochain commit enregistrera). Vos changements, eux, restent dans le dossier.

## In the game

Avec `git restore <fichier>`, la lettre **M** disparaît : le fichier est redevenu identique à la photo. Avec `--staged`, le fichier quitte la bande de **L'index** et retrouve son **M** (ou son **U** s'il est nouveau).

`git restore --staged --worktree <fichier>` fait les deux d'un coup. Pendant un conflit, `--ours` ou `--theirs` choisit la version à garder : la vôtre ou celle qui arrive.

## Example

L'IA a « harmonisé » `charte.md` en remplaçant tous les « vous » par « tu ». Ce n'était pas le projet :

- `git restore charte.md` : le fichier revient comme avant.

## Watch out

`git restore <fichier>` est l'une des rares commandes qui **perdent** du travail : ce qui n'avait jamais été enregistré disparaît, sans corbeille. En cas de doute, mettez plutôt les changements de côté avec `git stash`.

Un fichier nouveau (**U**) n'a pas de version précédente : `git restore` ne peut rien ramener.
