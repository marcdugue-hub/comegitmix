---
title: Un seul commit d'une autre voie
type: choice
timer: 60
repos: [local]
---

## Prompt
Sur ia/essai, seul le commit « faute corrigée » vous intéresse. Copiez-le sur main.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
git switch -c ia/essai
@work resume.md
git commit -m "faute corrigée"
@work intro.md
git commit -m "essai abandonné"
git switch main
```

## Choices
- [x] git cherry-pick ia/essai~1
- [ ] git merge ia/essai — merge rapporte aussi l'essai abandonné.
- [ ] git rebase ia/essai — rebase déplace main sur toute la voie.
- [ ] git cherry-pick ia/essai — c'est le dernier commit, l'essai abandonné.

## Goal
main a reçu la correction, pas l'essai.

## Takeaway
cherry-pick copie un seul commit.
