# 0005 — File-level conflicts and the `conflict` block

Date: 2026-11-07 · Status: Accepted

## Context
The engine is a pedagogical simulation ([GIT-MODEL](../GIT-MODEL.md)); files have no real content. Real Git detects conflicts on overlapping lines, which would require simulating content everywhere.

## Decision
- A merge, rebase or pull conflicts when **the same file was changed on both sides**. No line-level detection, no option to switch.
- A mission or puzzle may describe both versions of a file in a `conflict` block (syntax in `docs/AUTHORING.md`). The diff screen then shows them and offers a resolution: keep one side, the other, or both.
- Without such a block (always the case in the sandbox), clicking "diff" on a conflicted file shows a message explaining that the scenario does not detail the content, and that in a real project Git would show the conflicting lines. It is a limit of the scenario, not of Git.

## Consequences
- The engine stays simple; content authors add detail only where the story needs it.
- The player is never led to believe Git cannot show conflicts.
