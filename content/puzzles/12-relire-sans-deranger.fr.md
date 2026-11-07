---
title: Relire sans déranger
type: choice
timer: 60
repos: [local]
---

## Prompt
Votre dossier est plein de travail en cours, et on vous demande de relire les graphiques de l'IA sur la branche ia/graphiques. Relisez-les sans toucher à votre dossier.

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
- [ ] git switch ia/graphiques — tout votre dossier change de contenu pendant la revue : adieu vos brouillons.
- [ ] git stash — bon réflexe avant un switch, mais seul, il ne vous donne rien à relire.
- [ ] git worktree add ../revue -b ia/graphiques — -b crée une nouvelle branche ; celle-ci existe déjà, Git refusera.

## Goal
Un dossier revue sur ia/graphiques ; votre dossier garde ses M, intacts.

## Takeaway
Avec du travail en cours, relisez dans un worktree : un second bureau, un seul projet.
