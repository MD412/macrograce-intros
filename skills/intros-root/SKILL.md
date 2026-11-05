---
name: intros-root
description: Use when asked to add an intro, opening or presentation to a static site without naming a specific one. Inspects the site, reports whether it can carry an intro, and hands off to the right intro skill.
license: MIT
metadata:
  author: Marc Dandoy
  publisher: MacroGrace Systems
  homepage: https://macrogracesystems.com/skills
  version: "1.0.0"
---

# Intros

Inspect first. Pick one intro. Hand off.

## Catalog

| Intro | Status | Skill |
|---|---|---|
| Agentic build | Available | `build-intro-agentic` |
| Blueprint | Coming soon | none |
| Typeset | Coming soon | none |
| Develop | Coming soon | none |
| Guided tour | Coming soon | none |
| Terminal boot | Coming soon | none |

Never apply or imitate a coming soon intro. If the owner asks for one, say it has not shipped and offer Agentic build.

## Inspect

Read the site. Change nothing yet.

1. **Find the pages.** Locate the served root and list its HTML files. Check `dist`, `out`, `public`, `build` and `_site` when the repo root has none.
2. **Confirm the markup is real.** The runtime builds from elements already in the DOM. Open the entry page and check that `<body>` holds the content, not one empty mount node.
3. **Check the generator.** Read `package.json` and config files. Static output from Astro, Eleventy, Hugo, Jekyll or a similar tool is fine: edit the source layout so the tags reach every page. Client-rendered or server-rendered apps do not qualify.
4. **Check the head.** Look for a Content Security Policy in `<meta>` tags or in host config such as `vercel.json` and `_headers`. The head snippet is an inline script, so a policy without `'unsafe-inline'` needs a hash or nonce added.
5. **Check the shape.** Note the top `header` or `nav`, the last `footer`, sticky or fixed elements, and page length.
6. **Look for an existing intro.** Search for `layers.js`, `lx-pre` and `AgenticBuildIntro`. If found, offer to update it instead of adding a second one.
7. **Gather the facts.** Collect the owner's name, title, location and timezone from the site. Never invent one. Leave a field empty when the site does not state it.

## Decide

| Finding | Action |
|---|---|
| Real markup in static HTML | Use Agentic build |
| Static generator with source layouts | Use Agentic build, edit the layout |
| Empty mount node, client-rendered app | Stop and explain. Suggest a prerender first |
| Server-rendered app | Stop and explain |
| Intro already installed | Offer an update |

## Report

State the pick in three lines before editing: the intro, the reason, and any blocker such as a CSP or a sticky header to watch.

## Hand off

Load the `build-intro-agentic` skill and follow it, passing along the facts and findings. If it is not installed, run:

```bash
npx skills add MD412/macrograce-intros --skill build-intro-agentic
```
