---
title: Annuler sans réécrire
type: choice
timer: 60
repos: [local]
---

## Prompt
Le dernier commit, déjà partagé avec l'équipe, contient une erreur. Annulez-le sans faire disparaître l'histoire : vos collègues l'ont déjà lue.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work resume.md
git commit -m "erreur"
@remote origin
```

## Choices
- [x] git revert HEAD
- [ ] git reset --hard HEAD~1 — reset efface le commit, alors que d'autres l'ont déjà : au prochain échange, tout le monde est perdu.
- [ ] git restore resume.md — restore touche le fichier, pas le commit : l'erreur resterait dans l'histoire.
- [ ] git commit --amend — amend remplace le dernier commit : c'est réécrire l'histoire, justement.

## Goal
Un commit d'annulation ajouté après l'erreur : l'erreur reste visible, et corrigée.

## Takeaway
revert annule en avançant : rien n'est effacé, tout est expliqué.
