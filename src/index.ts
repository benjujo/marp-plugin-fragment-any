/**
 * Marpit plugin: fragment any block element via <!-- fragment --> comments.
 *
 * Usage with any Marpit-compatible instance:
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

// Marpit converts <!-- ... --> blocks to marpit_comment tokens and stores only
// the inner content (without the <!-- --> delimiters). Match that inner text.
const FRAGMENT_INNER_RE = /^fragment((?:\s+[\w-]+:[^\s>]*)*)\s*$/

// Fallback for non-Marpit markdown-it instances where the full HTML comment
// is still an html_block token.
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

function buildStyle(propStr: string): string {
  if (!propStr.trim()) return ''
  const props = propStr.trim().split(/\s+/).filter((p) => p.includes(':'))
  return ['position:absolute', ...props].join(';')
}

// For marpit_comment tokens — content is already the inner text without <!-- -->
function parseInnerContent(content: string): string | null {
  const match = FRAGMENT_INNER_RE.exec(content.trim())
  if (!match) return null
  return buildStyle(match[1])
}

// Fallback for plain html_block tokens (non-Marpit environments)
function parseComment(content: string): string | null {
  const match = FRAGMENT_COMMENT_RE.exec(content.trim())
  if (!match) return null
  return buildStyle(match[1])
}

function appendStyle(token: any, style: string) {
  const existing = token.attrGet('style')
  token.attrSet('style', existing ? `${existing};${style}` : style)
}

export function fragmentAny(md: any): void {
  if (!md.marpit) {
    throw new Error('marp-plugin-fragment-any requires a Marpit-compatible instance')
  }

  // Runs before marpit_apply_fragment so tokens get picked up by marpit's numbering pass.
  md.core.ruler.before(
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

        if (token.type === 'marpit_comment') {
          // Marpit path: content is the inner text of the comment (no <!-- -->)
          const style = parseInnerContent(token.content)
          if (style !== null) { pendingStyle = style; continue }
        } else if (token.type === 'html_block') {
          // Fallback: plain markdown-it where comment is still an html_block
          const style = parseComment(token.content)
          if (style !== null) { pendingStyle = style; continue }
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
  md.core.ruler.after(
    'marpit_apply_fragment',
    'marpit_fragment_any_style',
    (state: any) => {
      if (state.inlineMode) return
      for (const token of state.tokens) {
        if (token.type === 'html_block') {
          // html_block renders raw HTML — attrSet never reaches the output.
          // Inject data-marpit-fragment (and any position style) into the first tag.
          const fragmentNum = token.attrGet('data-marpit-fragment')
          const fragmentStyle = token.meta?.marpitFragmentStyle
          if (fragmentNum !== null || fragmentStyle) {
            let inject = ''
            if (fragmentNum !== null) inject += ` data-marpit-fragment="${fragmentNum}"`
            if (fragmentStyle) inject += ` style="${fragmentStyle}"`
            token.content = token.content.replace(/(<[A-Za-z][^>]*)(>)/, `$1${inject}$2`)
          }
        } else if (token.meta?.marpitFragmentStyle) {
          appendStyle(token, token.meta.marpitFragmentStyle)
        }
      }
    }
  )
}
