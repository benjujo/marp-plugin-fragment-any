# marp-plugin-fragment-any

A [Marpit](https://marpit.marp.app) plugin that extends the fragment (click-to-reveal) system to any block element — not just lists.

By default, Marp only supports fragmented lists using the `*` and `1)` markers. This plugin adds a `<!-- fragment -->` comment that makes the next block element a fragment, and optionally positions it anywhere on the slide.

## Installation

```bash
npm install marp-plugin-fragment-any
```

## Setup

```ts
import Marp from '@marp-team/marp-core'
import { fragmentAny } from 'marp-plugin-fragment-any'

const marp = new Marp().use(fragmentAny)
```

Works with any Marpit-compatible instance (`Marpit`, `Marp`, custom subclasses).

## Usage

### Basic reveal

Place `<!-- fragment -->` immediately before any block element. On each click, the next fragment is revealed.

```markdown
# My slide

This paragraph is visible immediately.

<!-- fragment -->
This paragraph appears on the first click.

<!-- fragment -->
This one appears on the second click.
```

### Positioned reveal

Add CSS `property:value` pairs to the comment to place the element anywhere on the slide. `position:absolute` is injected automatically, and the slide's `<section>` gets `position:relative` so all coordinates are relative to the slide area.

```markdown
# Images scattered around the slide

<!-- fragment top:80px left:40px -->
![width:200px](cat.png)

<!-- fragment top:200px right:60px -->
![width:200px](dog.png)

<!-- fragment bottom:60px left:45% -->
![width:200px](bird.png)
```

Any valid CSS property works: `top`, `left`, `right`, `bottom`, `width`, `height`, `transform`, `z-index`, etc.

## What counts as "the next block"

The comment applies to the next **block-level element** — not the next line. A block is a self-contained structural unit in Markdown:

| Block type | Example |
|---|---|
| Paragraph | `Some text` |
| Heading | `## Title` |
| Bullet list | `- item` |
| Ordered list | `1. item` |
| Blockquote | `> quote` |
| Table | `\| col \|` |
| Code block | ` ```code``` ` |
| Horizontal rule | `---` |

Blank lines between the comment and the element are fine — the comment "sticks" to the first block it finds:

```markdown
<!-- fragment -->

This paragraph is still the target, despite the blank line.
```

## Whole block vs. item-by-item

When `<!-- fragment -->` is placed before a **list**, the entire list is revealed as a single unit — all items appear on one click.

```markdown
<!-- fragment -->
- One          ← all three appear together on one click
- Two
- Three
```

To reveal items one by one, use Marp's built-in `*` / `1)` markers instead:

```markdown
* One          ← each item appears on a separate click
* Two
* Three
```

You can mix both styles on the same slide. They share the same counter and reveal in document order:

```markdown
<!-- fragment -->
An introductory paragraph — click 1.

* First point   — click 2
* Second point  — click 3

<!-- fragment -->
A concluding image — click 4.
```

## Fragment order

Fragments are numbered by document order — top to bottom. The counter is shared with `*` bullet and `1)` ordered list fragments, so mixing both styles works naturally.

## Limitations

- Only available in HTML exports. PDF and PPTX exports render all fragments as normal content, consistent with how Marp handles `*` / `1)` lists.
- The comment must appear at the **block level** (on its own line, separated by blank lines from surrounding content). An inline HTML comment inside a paragraph will not be detected.
- Positioned fragments use CSS `position:absolute`. If a theme sets `overflow:hidden` on the `<section>`, elements positioned near the edges may be clipped.
