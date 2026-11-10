---
title: gh repo create
summary: Create the online repository on GitHub, from the terminal.
syntax: gh repo create <name> --public --source=. --push
see: [remote, push, init]
---

## What it does

`gh` is **not a Git command**: it is the command line tool of **GitHub**, the site that hosts online repositories. `gh repo create` does what the site's "New repository" button does: it creates a repository on GitHub.

Two ways to use it:

- `gh repo create atelier-ia --public` creates an **empty** online repository. You then link it (`git remote add origin <address>`) and send (`git push -u origin main`).
- `gh repo create atelier-ia --public --source=. --push` does everything at once: it creates the repository, links it under the name origin from the current folder (the dot) and sends the current lane there.

`--public`: anyone can read it. `--private`: only invited people.

## In the game

The **origin** card appears in the **In Git** zone. Without `--source`, it says "Created on GitHub, empty": your local repository does not know it yet, and `git push` answers that there is no repository named origin. With `--source=. --push`, `origin/main` appears right away next to main.

In the game, `gh` only does `gh repo create`. Merge requests go through `glab`, GitLab's tool.

## Example

- `gh repo create atelier-ia --public`: an empty repository on GitHub.
- `git remote add origin https://github.com/demo/atelier-ia.git`: link it.
- `git push -u origin main`: send it.

## Watch out

With a real account, `gh` first asks you to sign in once (`gh auth login`). A public repository is visible to everyone: check that it holds no password or personal data before you send it.
