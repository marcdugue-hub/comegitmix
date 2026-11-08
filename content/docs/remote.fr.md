---
title: git remote
summary: La liste des dépôts en ligne que votre projet connaît.
syntax: git remote -v
see: [fork, fetch, push]
---

## What it does

Votre projet existe en plusieurs exemplaires : celui de votre poste, et un ou plusieurs **dépôts en ligne** (des « remotes »), hébergés sur un site comme GitLab ou GitHub. Chacun porte un petit nom, pour ne pas taper son adresse complète à chaque fois.

`git remote` affiche ces petits noms. Avec `-v` (pour « verbeux »), Git montre aussi, en vrai, l'adresse de chacun.

## In the game

Le jeu connaît deux dépôts en ligne, visibles comme des cartes dans la zone **Dans Git** :

- **upstream** : le projet d'origine, celui de l'équipe.
- **origin** : votre copie en ligne, celle où vous (et vos IA) poussez votre travail.

`git remote` les liste dans le terminal, avec leurs voies. Rien ne bouge dans la scène : c'est une commande qui regarde, sans rien changer.

## Example

- `git remote` : quels dépôts en ligne ?
- `git remote -v` : pareil, en plus détaillé.
- `fork` : s'il manque origin, créez votre copie.

## Watch out

Le nom compte : `git push` et `git fetch` visent `origin` quand on ne précise rien. Si le terminal répond qu'il n'y a pas de dépôt nommé origin, c'est qu'il n'existe pas encore. Le jeu ne permet pas d'en ajouter d'autres que origin et upstream.
