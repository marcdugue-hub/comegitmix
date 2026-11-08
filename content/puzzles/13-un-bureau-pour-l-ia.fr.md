---
title: Un bureau pour l'IA
type: typed
repos: [local]
---

## Prompt
Stéphane veut que l'IA travaille sur les graphiques sans toucher à votre dossier. Créez-lui un dossier à part, ../rapport-ia-graphiques, sur une nouvelle branche ia/graphiques.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
```

## Solution
solution: git worktree add ../rapport-ia-graphiques -b ia/graphiques
check:
- desk rapport-ia-graphiques on ia/graphiques

## Goal
Un nouveau dossier sur la branche ia/graphiques, relié au même .git.

## Takeaway
worktree add -b crée en une fois la branche et son dossier : l'IA travaille chez elle, vous chez vous.
