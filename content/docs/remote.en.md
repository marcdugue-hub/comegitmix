---
title: git remote
summary: The online repositories your project knows, and how to link one.
syntax: git remote add origin <address>
see: [gh, fork, fetch, push]
---

## What it does

Your project exists in several copies: the one on your computer, and one or more **online repositories** ("remotes"), hosted on a site like GitLab or GitHub. Each has a short nickname, so you do not have to type its full address every time.

`git remote` shows these nicknames. With `-v` (for "verbose"), Git also shows the address of each one.

`git remote add origin <address>` links your repository to an online repository that already exists (on GitHub, for instance created with `gh repo create`): Git writes the address down under the nickname origin. Nothing is sent; that is what `git push` does next.

## In the game

The game knows two online repositories, shown as cards in **In Git**:

- **upstream**: the original project, the team's.
- **origin**: your copy online, where you (and your AIs) push your work.

`git remote` lists them in the terminal, with their lanes. Nothing moves in the scene: it is a command that looks without changing anything.

When a repository has just been created on GitHub without being linked, its card says "Created on GitHub, empty". After `git remote add origin <address>`, it becomes "linked, but still empty", until the first `git push`.

## Example

- `git remote`: which online repositories?
- `git remote -v`: the same, in more detail.
- `git remote add origin https://github.com/demo/atelier-ia.git`: link the repository created on GitHub.
- `fork`: if origin is missing for a team project, create your copy.

## Watch out

The name matters: `git push` and `git fetch` aim at `origin` when you do not say otherwise. If the terminal says there is no repository named origin, it does not exist yet. The game only knows origin and upstream, and refuses to link an address where nothing was created; real Git would accept it and only complain at the first push.
