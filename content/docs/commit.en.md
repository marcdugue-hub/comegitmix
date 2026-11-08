---
title: git commit
summary: Take a snapshot of the project and add it to your lane.
syntax: git commit -m "<message>"
see: [add, status, log, revert]
---

## What it does

A **commit** is a photo of the project at a given moment, with a short caption (the message) saying what changed and why. Git keeps every photo: you can always go back, compare or undo.

The photo does not take the whole folder: it takes **the index**, meaning what you prepared with `git add`. The rest waits its turn.

## In the game

A new dot appears at the end of your lane (your **branch**), in **The lanes**. The index empties: everything that was staged is now saved.

- `git commit -m "message"`: the usual form.
- `git commit -am "message"`: first stages the **modified** files (not the new ones), then takes the photo.
- `git commit --amend`: redoes the last photo with the current content; the old one disappears from the lane.

With no message, or nothing staged, the game refuses and tells you why.

## Example

The AI wrote the summary, you read it through:

- `git add summary.md`
- `git commit -m "Add the report summary"`

## Watch out

The message is for Stéphane, for you in six months, and for the next AI that comes along. "Changes" says nothing; "Fix the quote total" says it all.

Only use `--amend` on a photo nobody has fetched yet: redoing it changes its identity, and people who had the old one would get lost.
