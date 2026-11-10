---
title: GitHub en une commande
type: typed
repos: [local]
folder: atelier-ia
---

## Prompt
Votre dépôt atelier-ia a son premier commit, et rien n'existe encore sur GitHub. En une seule commande gh : créez le dépôt public sur GitHub, reliez-le sous le nom origin à partir du dossier courant, et envoyez-y main.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "Premier commit"
```

## Solution
solution: gh repo create atelier-ia --public --source=. --push
check:
- main = origin/main

## Goal
Le dépôt existe sur GitHub, relié sous le nom origin, et origin/main est à jour.

## Takeaway
gh repo create --source=. --push fait trois choses d'un coup : créer le dépôt en ligne, le relier (git remote add) et envoyer (git push -u). Le chemin long reste utile pour comprendre ce qui se passe.
