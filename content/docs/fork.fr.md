---
title: fork
summary: Faire sa propre copie en ligne d'un projet qui ne vous appartient pas.
syntax: fork
see: [remote, push, mr]
---

## What it does

Attention, `fork` n'est **pas une commande Git** : c'est un bouton du site d'hébergement (GitLab, GitHub), là où le projet vit en ligne.

Vous voulez contribuer à un projet dont vous n'avez pas les clés. Plutôt que de demander la permission d'écrire dedans, vous en faites une **copie en ligne à votre nom** : un fork. Vous y travaillez librement, puis vous proposez vos changements au projet d'origine par une demande de fusion (MR).

Par convention, le projet d'origine s'appelle `upstream` (« en amont ») et votre copie `origin`.

## In the game

Dans la zone **Dans Git**, une nouvelle carte apparaît : **origin**, votre copie en ligne, reliée à **upstream** par une flèche « fork ». Votre poste connaît désormais origin : ses voies apparaissent comme étiquettes `origin/…` dans **Les voies**.

On tape simplement `fork` dans le terminal (sans `git`), ou on clique sur le bouton de la palette.

## Example

- `fork` : origin devient votre copie de upstream.
- `git remote -v` : vérifier que les deux dépôts en ligne sont bien connus.
- `git push` : envoyer votre travail sur origin, jamais directement sur upstream.

## Watch out

Un fork se fait **une seule fois**. Si origin existe déjà, le jeu refuse : vous avez déjà votre copie. Et le fork ne se met pas à jour tout seul : si le projet d'origine avance, votre copie, elle, reste où elle était.
