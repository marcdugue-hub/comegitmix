---
title: Your own repository
duration: 12
repos: [local]
folder: atelier-ia
unlocks: [init, gh-repo-create, remote-add]
---

> duo: The Pivert report is out. On Monday you prepare an AI workshop for your colleagues: a folder on your disk with an agenda, a sign-up list and a README. This folder has never seen Git. Let's make it a repository, then put it on GitHub so Stéphane can follow it.

## Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
```

## Part A — From folder to repository
> duo: For now, atelier-ia is a folder like any other. Let's see what Git thinks of it.

### 1. Ask Git
command: git status
check: error not-a-repo
The usual question: what has changed? Except that Git was never invited into this folder.
after: Git refuses: there is no .git folder here, so no repository. Your files are really there, but Git has nothing to compare them with.
note: No .git = no Git
hint: Read the answer: Git cannot find a repository.

### 2. Create the repository
command: git init
git init creates a hidden folder, .git, inside your folder. It is the notebook where Git will keep every snapshot. Your files do not move.
after: The “Local repository · .git” card appears at the top. Your three files carry a U: they are there, but Git does not track them yet. The main lane is waiting for its first commit.
note: .git = the project's memory
hint: Two words: git and a word that means “start”.

### 3. Put everything in the index
command: git add .
accepts: git add -A ; git add README.md programme.md inscrits.csv ; git add README.md inscrits.csv programme.md
For the very first snapshot we want the whole folder. The dot means “everything here”.
after: The three files turn A (added): they will be in the first snapshot.
hint: git add followed by a dot.

### 4. The first snapshot
command: git commit -m "First commit"
accepts: git commit -m "*"
The first commit is a snapshot like any other, except that it has no parent: it is where the story starts.
after: A first circle on the main lane. The folder is now a Git repository, with a one-commit history.

### Part end
summary: atelier-ia has become a repository: a .git, a main lane and a first snapshot. Everything is still on your disk; nobody else can see it yet.

## Part B — Put it on GitHub
> duo: Stéphane wants to follow the workshop. We need an online copy: a repository on GitHub, linked to yours.

### Setup
```git-setup
@no-git
@new README.md programme.md inscrits.csv
git init
git add .
git commit -m "First commit"
```

### 1. Create the empty repository on GitHub
command: gh repo create atelier-ia --public
accepts: gh repo create atelier-ia --private ; gh repo create atelier-ia
On the GitHub website, this would be the “New repository” button. On the command line, GitHub's gh tool does the same. --public: anyone can read it; --private: only invited people.
after: The origin card appears: the repository exists on GitHub, but it is empty and your local repository does not know it yet.
hint: gh repo create, the folder name, then --public.

### 2. Link the two repositories
command: git remote add origin https://github.com/demo/atelier-ia.git
accepts: git remote add origin *
git remote add gives a short name to an online address. By convention the main copy is called origin. Nothing is sent: we only write down the address.
after: Your repository now knows origin. The card says “linked, but still empty”.
note: origin = a short name for an address
hint: git remote add, then origin, then the repository address.

### 3. Send the first snapshot
command: git push -u origin main
accepts: git push --set-upstream origin main
check: main = origin/main
push sends your commits to origin. -u remembers the link between your main and GitHub's: next time a plain git push is enough.
after: origin/main appears next to main: the project is online. Stéphane can open it on GitHub, and the README is shown on the project page.

### Part end
summary: The repository is on GitHub and linked to yours. From now on: add, commit, push.

## End
summary: An ordinary folder became a Git repository, then a project shared on GitHub. That is exactly what a team does on the first day of a project.
takeaway: git init creates the repository, add and commit take the first snapshot, gh repo create makes the online copy, git remote add links it, git push -u sends it.
next: puzzle 16-pas-encore-un-depot
