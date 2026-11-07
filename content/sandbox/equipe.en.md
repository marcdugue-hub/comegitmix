---
title: Team
repos: [local, origin, upstream]
---
The original project, your fork, an MR opened by an assistant and a colleague who just pushed.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@remote upstream
@fork upstream origin
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "chart"
@author human
git switch main
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Add the charts" comments=2
@colleague main "Fix the figures"
```
