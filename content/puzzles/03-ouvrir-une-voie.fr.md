---
title: Ouvrir une voie et s'y placer
type: choice
timer: 60
repos: [local]
---

## Prompt
L'assistant doit travailler sur le plan sans marcher sur main. Créez la branche ia/plan et placez-vous dessus, en une seule commande.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Choices
- [x] git switch -c ia/plan
- [ ] git branch ia/plan — la voie existe, mais vous restez sur main, devant la porte fermée.
- [ ] git switch ia/plan — impossible de rejoindre une voie qui n'existe pas encore.
- [ ] git worktree add ia/plan — il manque l'adresse du nouveau dossier.

## Goal
Votre dossier est sur la nouvelle voie ia/plan.

## Takeaway
switch -c : on crée la voie et on s'y met, en un geste.
