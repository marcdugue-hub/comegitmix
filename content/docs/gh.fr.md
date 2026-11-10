---
title: gh repo create
summary: Créer le dépôt en ligne sur GitHub, depuis le terminal.
syntax: gh repo create <nom> --public --source=. --push
see: [remote, push, init]
---

## What it does

`gh` n'est **pas une commande Git** : c'est l'outil en ligne de commande de **GitHub**, le site qui héberge les dépôts en ligne. `gh repo create` fait ce que ferait le bouton « New repository » du site : il crée un dépôt sur GitHub.

Deux façons de s'en servir :

- `gh repo create atelier-ia --public` crée un dépôt **vide** en ligne. Il reste ensuite à le relier (`git remote add origin <adresse>`) puis à envoyer (`git push -u origin main`).
- `gh repo create atelier-ia --public --source=. --push` fait tout d'un coup : il crée le dépôt, le relie sous le nom origin à partir du dossier courant (le point) et y envoie la voie courante.

`--public` : tout le monde peut le lire. `--private` : seulement les personnes invitées.

## In the game

La carte **origin** apparaît dans la zone **Dans Git**. Sans `--source`, elle indique « Créé sur GitHub, vide » : votre dépôt local ne la connaît pas encore, et `git push` répond qu'il n'y a pas de dépôt nommé origin. Avec `--source=. --push`, `origin/main` apparaît tout de suite à côté de main.

Dans le jeu, `gh` ne sait faire que `gh repo create`. Les demandes de fusion passent par `glab`, l'outil de GitLab.

## Example

- `gh repo create atelier-ia --public` : un dépôt vide sur GitHub.
- `git remote add origin https://github.com/demo/atelier-ia.git` : le relier.
- `git push -u origin main` : l'envoyer.

## Watch out

Pour un vrai compte, `gh` demande d'abord de se connecter une fois (`gh auth login`). Un dépôt public est visible par tous : vérifiez qu'il ne contient ni mot de passe ni donnée personnelle avant de l'envoyer.
