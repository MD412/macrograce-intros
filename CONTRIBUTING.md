# Contributing

An intro is one skill. It runs on the site's real content, ends on the site as it was, and adds no build step.

## Add an intro

1. Copy `template/SKILL.md` to `skills/<verb-noun>/SKILL.md`.
2. Set `name` to the folder name. Start `description` with "Use when".
3. Put runtime files in `assets/` inside the skill and design references in `references/`.
4. Add a plugin entry to `.claude-plugin/marketplace.json`.
5. Add the intro to the catalog in `skills/intros-root/SKILL.md` and the table in `README.md`.
6. Run `node scripts/check.mjs`. CI runs the same check.

## Rules

- No code comments in any file.
- No em dashes in any copy.
- Short copy. Plain words.
- No AI-generated people.
- Never invent facts about a site's owner.
- Respect `prefers-reduced-motion` and give every visitor a way to skip.

## Budgets

- Each file in `assets/`: under 3 MB.
- Each skill folder: under 200 KB.

## Pull requests

Include a recording at desktop and phone widths, and the site it ran on.
