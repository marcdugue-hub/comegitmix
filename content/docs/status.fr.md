---
title: git status
summary: Faire le point : ce qui a changé, ce qui est prêt, sur quelle voie vous êtes.
syntax: git status
see: [add, diff, log]
---

## What it does

`git status` ne change rien : il regarde et il raconte. C'est la question « où en est-on ? » posée à Git.

Il répond à trois choses :

- sur quelle voie (une **branche**) travaille ce dossier ;
- quels fichiers ont changé depuis le dernier **commit** (la dernière photo enregistrée du projet) ;
- lesquels sont déjà dans **l'index**, la liste de ce que le prochain commit enregistrera.

Il signale aussi une opération en cours, comme une fusion bloquée par un conflit.

## In the game

Le jeu résume la réponse en une phrase : combien de fichiers ont changé, combien sont préparés. Le détail donne la voie, puis les fichiers rangés par catégorie ; survolez une ligne et le fichier s'allume dans la scène.

Sur votre bureau, dans **Sur votre poste**, chaque fichier porte déjà sa lettre : **M** modifié, **U** nouveau (Git ne le connaît pas encore), **A** préparé, **D** supprimé, **!** en conflit.

Quand rien n'a bougé, le jeu vous le dit : le dossier correspond exactement au dernier commit de sa voie.

## Example

Une IA vient de travailler dans votre dossier. Avant de lui faire confiance :

- `git status` : deux fichiers modifiés, un nouveau, rien de préparé.
- `git diff` : vous regardez ce qu'elle a vraiment changé.

## Watch out

Aucun risque : il ne fait que lire. Tapez-le avant chaque commande qui modifie quelque chose ; c'est le « je regarde avant de traverser » de Git.

Il ne parle que du dossier où vous êtes. Un autre bureau (un autre dossier de travail) a son propre état.
