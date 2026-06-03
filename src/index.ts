import { marpitPlugin } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

/**
 * Marpit plugin: fragment any block element via <!-- fragment --> comments.
 *
 * Usage:
 *   import { fragmentAny } from 'marp-plugin-fragment-any'
 *   new Marp().use(fragmentAny)
 *
 * Syntax in markdown:
 *   <!-- fragment -->                       — reveal in document flow
 *   <!-- fragment top:80px left:40px -->    — reveal at an absolute position on the slide
 *
 * Any number of CSS property:value pairs can be supplied. When present,
 * position:absolute is injected automatically and the slide's <section>
 * receives position:relative so coordinates are always relative to the slide.
 *
 * Fragment order follows document position and shares the counter with * and 1) lists.
 */

const FRAGMENT_COMMENT_RE = /<!--\s*fragment((?:\s+[\w-]+:[^\s>]*)*)\s*-->/

const BLOCK_OPEN_TYPES = new Set([
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'table_open',
])

const SELF_CLOSING_BLOCK_TYPES = new Set([
  'fence',
  'code_block',
  'hr',
  'html_block',
])

function parseComment(content: string): string | null {
  const match = FRAGMENT_COMMENT_RE.exec(content.trim())
  if (!match) return null

  const propStr = match[1].trim()
  if (!propStr) return ''

  const props = propStr.split(/\s+/).filter((p) => p.includes(':'))
  return ['position:absolute', ...props].join(';')
}

function appendStyle(token: any, style: string) {
  const existing = token.attrGet('style')
  token.attrSet('style', existing ? `${existing};${style}` : style)
}

export const fragmentAny = marpitPlugin(function fragmentAny(md: MarkdownIt) {
  // Runs before marpit_apply_fragment so tokens get picked up by marpit's numbering pass.
  ;(md as any).core.ruler.before(
    'marpit_apply_fragment',
    'marpit_fragment_any',
    (state: any) => {
      if (state.inlineMode) return

      let pendingStyle: string | null = null
      let currentSlideToken: any = null
      let slideHasPositioned = false

      for (const token of state.tokens) {
        if (token.meta?.marpitSlideElement === 1) {
          currentSlideToken = token
          slideHasPositioned = false
        } else if (token.meta?.marpitSlideElement === -1) {
          if (slideHasPositioned && currentSlideToken) {
            appendStyle(currentSlideToken, 'position:relative')
          }
        }

        if (token.type === 'html_block') {
          const style = parseComment(token.content)
          if (style !== null) {
            pendingStyle = style
            continue
          }
        }

        if (
          pendingStyle !== null &&
          (BLOCK_OPEN_TYPES.has(token.type) ||
            SELF_CLOSING_BLOCK_TYPES.has(token.type))
        ) {
          token.meta = token.meta || {}
          token.meta.marpitFragment = true
          if (pendingStyle) {
            token.meta.marpitFragmentStyle = pendingStyle
            slideHasPositioned = true
          }
          pendingStyle = null
        }
      }
    }
  )

  // Runs after marpit_apply_fragment to apply stored inline styles without
  // interfering with marpit's fragment counter logic.
  ;(md as any).core.ruler.after(
    'marpit_apply_fragment',
    'marpit_fragment_any_style',
    (state: any) => {
      if (state.inlineMode) return
      for (const token of state.tokens) {
        if (token.meta?.marpitFragmentStyle) {
          appendStyle(token, token.meta.marpitFragmentStyle)
        }
      }
    }
  )
})
