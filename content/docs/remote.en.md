---
title: git remote
summary: The list of online repositories your project knows.
syntax: git remote -v
see: [fork, fetch, push]
---

## What it does

Your project exists in several copies: the one on your computer, and one or more **online repositories** ("remotes"), hosted on a site like GitLab or GitHub. Each has a short nickname, so you do not have to type its full address every time.

`git remote` shows these nicknames. With `-v` (for "verbose"), real Git also shows the address of each one.

## In the game

The game knows two online repositories, shown as cards in **In Git**:

- **upstream**: the original project, the team's.
- **origin**: your copy online, where you (and your AIs) push your work.

`git remote` lists them in the terminal, with their lanes. Nothing moves in the scene: it is a command that looks without changing anything.

## Example

- `git remote`: which online repositories?
- `git remote -v`: the same, in more detail.
- `fork`: if origin is missing, create your copy.

## Watch out

The name matters: `git push` and `git fetch` aim at `origin` when you do not say otherwise. If the terminal says there is no repository named origin, it does not exist yet. The game does not let you add any others besides origin and upstream.
