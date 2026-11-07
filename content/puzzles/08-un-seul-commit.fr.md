---
title: Un seul commit d'une autre voie
type: choice
timer: 60
repos: [local]
---

## Prompt
Sur ia/essai, l'IA a corrigé une faute, puis s'est lancée dans un essai douteux. Seul le commit « faute corrigée » vous intéresse : copiez-le sur main, sans l'essai.

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
- [ ] git merge ia/essai — merge rapporte toute la voie, essai douteux compris.
- [ ] git rebase ia/essai — rebase replace main derrière toute la voie, essai compris.
- [ ] git cherry-pick ia/essai — le dernier commit de la voie, c'est justement l'essai abandonné.

## Goal
main a reçu la correction, et rien d'autre.

## Takeaway
cherry-pick copie un seul commit : on prend la cerise, pas le gâteau.
