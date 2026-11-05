---
name: build-intro-agentic
description: Use when asked to add an agentic build intro, start screen or build animation to a static or plain-HTML site. A start screen introduces the owner, a scan traces the real layout, and labeled cursor agents build the actual page, which ends flat and normal.
license: MIT
metadata:
  author: Marc Dandoy
  publisher: MacroGrace Systems
  homepage: https://macrogracesystems.com/skills
  version: "1.0.0"
---

# Build Intro: Agentic

A start screen, a scan of the real page, then a build of the real page by labeled cursor agents. No framework, no build step. Two files.

## Files

- `assets/layers.js`: the runtime. Reads config, shows the gate, runs the scan and the build.
- `assets/layers.css`: all styles, themed through `--lx-*` custom properties.
- `assets/head-snippet.html`: the three tags every page needs in its head.
- `references/gate-design.html`, `references/scan-design.html`: standalone designs. Start here if the owner wants a new gate or scan.

## Steps

1. **Back up the site.** Copy `layers.js` and `layers.css` into it. Default paths are `/js/layers.js` and `/css/layers.css`. Adjust the snippet if the site uses others.
2. **Add the head tags to every page.** Paste `assets/head-snippet.html` into each `<head>`. The inline script hides the page before paint only when the intro will run, and unhides it after 4s if the runtime never loads.
3. **Set the options.** Use `data-*` attributes on the script tag, or a `window.AgenticBuildIntro` object set before the script loads. The object wins.

   | Key | Attribute | Default |
   |---|---|---|
   | `name` | `data-name` | `document.title` |
   | `initials` | `data-initials` | first letters of `name` |
   | `title` | `data-title` | hidden when empty |
   | `location` | `data-location` | hidden when empty |
   | `timezone` | `data-timezone` | visitor's local time |
   | `clock` | `data-clock` | `true` |
   | `cta` | `data-cta` | `Initiate Portfolio Build` |
   | `skip` | `data-skip` | `Skip to site` |
   | `agents` | `data-agents` | 30 desktop, 14 phone |
   | `colors` | `data-colors` | built-in palette, comma list |
   | `holdUntil` | `data-hold-until` | bottom of the top `header`, `nav` or `[role=banner]` |
   | `rampFrom` | `data-ramp-from` | 50% of page height |
   | `rampMid` | `data-ramp-mid` | `1.2` |
   | `rampEnd` | `data-ramp-end` | `1.5` |
   | `replay` | `data-replay` | `true` |
   | `replayLabel` | `data-replay-label` | `Replay animation` |
   | `replayBefore` | `data-replay-before` | last `footer` or `[role=contentinfo]`, else end of body |

   Use only facts the owner gave you. Never invent a name, title or location. Any extra copy is neutral UI text. Change `cta` if the site is not a portfolio.
4. **Match the design system.** Read the site's CSS variables and fonts, then override the `--lx-*` tokens on `:root` in the site's own stylesheet: `--lx-bg`, `--lx-surface`, `--lx-stroke`, `--lx-text`, `--lx-muted`, `--lx-soft`, `--lx-ink`, `--lx-accent-1` to `--lx-accent-4`, `--lx-font-display`, `--lx-font-body`, `--lx-replay-bg`, `--lx-replay-hover`, `--lx-replay-active`, `--lx-replay-stroke`. The kit does not load fonts. Pick vibrant agent colors that read on the site's background.
5. **Leave the scan alone.** Outlines come from the same element list the build uses, so they sit exactly where the content lands and agents hand off at the same spots. Never swap in a generic wireframe.
6. **Keep these behaviors.**
   - Boxes drag out with handles and W x H labels. Text types with a caret. Guide lines flash while agents work.
   - Header first. The page holds at the top until everything above `holdUntil` is built.
   - One clock. Speed ramps by page position, 1x at the top, `rampMid` at `rampFrom`, `rampEnd` at the footer. Cursors, boxes, typing, image wipes, scan and scroll all share it. Set `rampMid` and `rampEnd` to `1` to disable.
   - Stable typing. Text is laid out as hidden word spans and revealed word by word, so lines never rewrap mid-type.
   - Pacing adapts toward a goal of about 20 seconds. Agents always build every element down to the footer. A 40 second cap is the only hard stop.
   - Follow scroll eases down with the work and never jumps back to the top.
   - A Replay pill sits in normal flow above the footer and replays the build from a clean state.
   - Shows on fresh visits and reloads, skipped on in-site navigation after it ran in the tab. `?build=1` forces it, `?build=0` skips. Enter starts, Esc skips the gate. Wheel, click, touch or any key skips a running intro.
   - Works down to 390px with fewer agents on phones. `prefers-reduced-motion` skips the intro.
7. **Code rules.** No code comments, no em dashes in copy, no AI-generated people.
8. **Verify by recording.** Run `node --check` on the JS. Serve the site and record Playwright video at 1280x800 and 390x844: open `?build=1`, click start, record 20 to 60s. Pull frames for the gate, scan, handoff, build and end state, check for page errors, and fix what you see. Confirm every existing page still returns 200.
9. **Report** the live link, a gate screenshot and the recording.
