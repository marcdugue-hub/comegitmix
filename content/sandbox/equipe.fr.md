---
title: Équipe
repos: [local, origin, upstream]
---
Le projet d'origine, votre copie personnelle (le fork), une demande de fusion (MR) ouverte par un assistant, et un collègue qui vient de pousser ses changements. Bienvenue en équipe : il y a toujours quelqu'un qui a fait quelque chose pendant que vous lisiez ceci.

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
git commit -m "graphique"
@author human
git switch main
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Ajout des graphiques" comments=2
@colleague main "Correction des chiffres"
```
