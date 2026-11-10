---
title: Link to GitHub
type: choice
timer: 60
repos: [local]
folder: atelier-ia
---

## Prompt
You created the empty atelier-ia repository on GitHub, but your local repository does not know it: git push does not know where to send. Link the two.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "First commit"
gh repo create atelier-ia --public
```

## Choices
- [x] git remote add origin https://github.com/demo/atelier-ia.git
- [ ] git push — without a repository named origin, Git does not know where to send: first give it the address.
- [ ] git clone https://github.com/demo/atelier-ia.git — clone would make a second, empty copy of the project instead of linking the one you have.
- [ ] gh repo create atelier-ia --public — the repository already exists on GitHub; creating a second one links nothing.

## Goal
Your repository knows origin: the GitHub card goes from “not linked yet” to “linked, but still empty”.

## Takeaway
git remote add origin <address> links your repository to its online copy. Only then does git push know where to send.
