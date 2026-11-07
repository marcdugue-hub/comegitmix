---
title: Reculer sa branche
type: choice
timer: 60
repos: [local]
---

## Prompt
Vos deux derniers commits, restés chez vous, étaient des essais ratés. Reculez la branche de deux commits, mais gardez le contenu dans vos fichiers pour repartir de là.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "essai 1"
@work plan.md
git commit -m "essai 2"
```

## Choices
- [x] git reset HEAD~2
- [ ] git reset --hard HEAD~2 — --hard efface aussi le contenu des fichiers : table rase, essais compris.
- [ ] git revert HEAD~2 — revert avance en ajoutant un commit ; on veut reculer.
- [ ] git switch --detach HEAD~2 — vous allez regarder deux commits plus tôt, mais la branche, elle, ne bouge pas.

## Goal
main a reculé de deux commits ; plan.md est en M : le contenu des essais est conservé.

## Takeaway
reset recule la branche ; sans --hard, il garde vos fichiers.
