---
title: Relier à GitHub
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
Vous avez créé le dépôt vide atelier-ia sur GitHub, mais votre dépôt local ne le connaît pas : git push ne sait pas où envoyer. Reliez les deux.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "Premier commit"
gh repo create atelier-ia --public
```

## Choices
- [x] git remote add origin https://github.com/demo/atelier-ia.git
- [ ] git push — sans dépôt nommé origin, Git ne sait pas où envoyer : il faut d'abord lui donner l'adresse.
- [ ] git clone https://github.com/demo/atelier-ia.git — clone ferait une deuxième copie du projet, vide en plus, au lieu de relier celle que vous avez.
- [ ] gh repo create atelier-ia --public — le dépôt existe déjà sur GitHub ; en créer un second ne relie rien.

## Goal
Votre dépôt connaît origin : la carte GitHub passe de « pas encore relié » à « relié, mais encore vide ».

## Takeaway
git remote add origin <adresse> relie votre dépôt à sa copie en ligne. Ensuite seulement, git push sait où envoyer.
