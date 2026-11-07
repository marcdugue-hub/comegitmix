---
title: Relire sans déranger
type: choice
timer: 60
repos: [local]
---

## Prompt
Vous avez du travail en cours et devez relire la branche ia/graphiques sans toucher à votre dossier.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "graphique"
@author human
git switch main
@work plan.md
```

## Choices
- [x] git worktree add ../revue ia/graphiques
- [ ] git switch ia/graphiques — votre dossier change de contenu pendant toute la revue.
- [ ] git stash — utile avant un switch, mais ne permet pas de relire seul.
- [ ] git worktree add ../revue -b ia/graphiques — -b crée une nouvelle branche, or elle existe déjà.

## Goal
Un dossier revue sur ia/graphiques ; votre dossier garde ses M.

## Takeaway
Avec du travail en cours, relisez dans un worktree.
