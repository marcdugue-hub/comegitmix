---
title: Conflit prêt à résoudre
repos: [local]
---
Vous et l'IA avez réécrit la même ligne de plan.md, chacun de votre côté, sans vous prévenir. Résultat : deux dates de livraison. Vous êtes sur main, juste avant de rapatrier la voie de l'IA : tapez git merge ia/resume pour voir Git hésiter, puis choisissez la version à garder.

## Setup
```git-setup
@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "résumé raccourci"
@work plan.md
git commit -m "livraison décalée en avril"
@author human
git switch main
@work plan.md
git commit -m "livraison confirmée en mars"
```

```conflict plan.md
<<< main
Livraison du rapport : fin mars.
=== ia/resume
Livraison du rapport : mi-avril, après relecture des chiffres.
>>>
```
