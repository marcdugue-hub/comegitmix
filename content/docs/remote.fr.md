---
title: git remote
summary: Les dépôts en ligne que votre projet connaît, et comment en relier un.
syntax: git remote add origin <adresse>
see: [gh, fork, fetch, push]
---

## What it does

Votre projet existe en plusieurs exemplaires : celui de votre poste, et un ou plusieurs **dépôts en ligne** (des « remotes »), hébergés sur un site comme GitLab ou GitHub. Chacun porte un petit nom, pour ne pas taper son adresse complète à chaque fois.

`git remote` affiche ces petits noms. Avec `-v` (pour « verbeux »), Git montre aussi l'adresse de chacun.

`git remote add origin <adresse>` relie votre dépôt à un dépôt en ligne déjà créé (sur GitHub, par exemple avec `gh repo create`) : Git note l'adresse sous le petit nom origin. Rien n'est envoyé ; c'est ensuite le rôle de `git push`.

## In the game

Le jeu connaît deux dépôts en ligne, visibles comme des cartes dans la zone **Dans Git** :

- **upstream** : le projet d'origine, celui de l'équipe.
- **origin** : votre copie en ligne, celle où vous (et vos IA) poussez votre travail.

`git remote` les liste dans le terminal, avec leurs voies. Rien ne bouge dans la scène : c'est une commande qui regarde, sans rien changer.

Quand un dépôt vient d'être créé sur GitHub sans être relié, sa carte dit « Créé sur GitHub, vide ». Après `git remote add origin <adresse>`, elle devient « relié, mais encore vide », jusqu'au premier `git push`.

## Example

- `git remote` : quels dépôts en ligne ?
- `git remote -v` : pareil, en plus détaillé.
- `git remote add origin https://github.com/demo/atelier-ia.git` : relier le dépôt créé sur GitHub.
- `fork` : s'il manque origin pour un projet d'équipe, créez votre copie.

## Watch out

Le nom compte : `git push` et `git fetch` visent `origin` quand on ne précise rien. Si le terminal répond qu'il n'y a pas de dépôt nommé origin, c'est qu'il n'existe pas encore. Le jeu ne connaît que origin et upstream, et refuse de relier une adresse où rien n'a été créé ; le vrai Git, lui, l'accepterait et ne se plaindrait qu'au premier push.
