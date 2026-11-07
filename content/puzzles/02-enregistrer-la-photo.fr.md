---
title: Enregistrer la photo
type: choice
timer: 60
repos: [local]
---

## Prompt
intro.md est préparé. Enregistrez-le.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work intro.md
git add intro.md
```

## Choices
- [x] git commit -m "Intro"
- [ ] git add intro.md — il est déjà préparé.
- [ ] git push — push envoie en ligne des commits qui existent déjà.
- [ ] git stash — stash met de côté, il n'enregistre rien dans l'histoire.

## Goal
Un commit de plus sur main.

## Takeaway
commit enregistre ce qui est dans l'index.
