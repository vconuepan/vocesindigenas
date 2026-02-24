# Open-Source Preparation

Implement all file changes needed before the repo goes public, per `pm/artifacts/open-source/`.

## Scope

This plan covers **Step 1** of the go-live checklist — adding and modifying files in the codebase. Steps 2-7 (commit, push, flip to public, configure GitHub, etc.) are manual user actions.

## Changes

### 1. Create `LICENSE` (new file, repo root)

Download the official AGPL v3 text and prepend the copyright notice from `license-instructions.md`.

### 2. Create `CONTRIBUTING.md` (new file, repo root)

Copy content from `contributing-draft.md` (lines 3-79, excluding the HTML comment on line 1).

### 3. Create `server/.env.sample` (new file)

Copy the fenced block from `env-sample-draft.md` (lines 8-301).

### 4. Update `README.md`

- Replace `<repository-url>` with `https://github.com/OdinMB/actually-relevant.git`
- Add badges after the H1 heading
- Add Contributing, Stewardship, and License sections before `## Troubleshooting`
- Update Project Structure tree to include new files (LICENSE, CONTRIBUTING.md, .context/, .specs/)

### 5. Update `.gitignore`

Add entries for `pm/`, `.claude/settings.json`, `.claude/settings.local.json`, `.claude/to-add-for-batches.txt`.

### 6. Untrack `.claude/settings.local.json`

Run `git rm --cached .claude/settings.local.json` to stop tracking without deleting the local file.

## Out of scope

- No tests needed (documentation-only changes)
- No spec/context file updates (no domain behavior changed)
- Committing, pushing, flipping repo to public — all user actions
