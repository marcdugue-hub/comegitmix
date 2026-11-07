---
title: Conflit prêt à résoudre
repos: [local]
---
Deux voies ont modifié le même fichier, plan.md. Vous êtes sur main, juste avant de rapatrier la voie de l'IA : tapez git merge ia/resume pour voir le conflit, puis choisissez la version à garder.

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
