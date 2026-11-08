# 0012 — "More details" in the sandbox only

Date: 2026-11-08 · Status: Accepted · Amends: [0010](0010-product-defaults.md) (raw output)

## Context
The mission screen had a "More details" button. Mission steps rarely produce raw output, so for the player the button almost never did anything visible. Marc asked to remove it.

## Decision
- The "More details" toggle (raw output of `git status` / `git log`) exists in the **sandbox only**.
- Missions show the Git command, the explanation and "What just happened", never raw output.

## Consequences
The saved details preference only affects the sandbox.
