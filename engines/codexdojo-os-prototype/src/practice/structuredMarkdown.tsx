// AID-3643: safe structured rendering for already-ratified learner-facing
// text (pinned pg-c01 projection + approved UI copy). Presentation-only by
// construction: React elements are built directly from the string — there is
// no HTML parsing and no dangerouslySetInnerHTML anywhere, so any input can
// only ever render as literal text. The source string is never mutated; the
// deterministic receipt, for example, keeps its byte-identical raw form for
// clipboard archival while being displayed with visible structure.
//
// Supported subset (everything the ratified texts use): headings, paragraphs,
// `-`/`*` and `1.` lists with indented continuation lines, `>` blockquotes,
// ``` fences, `**bold**` and `` `code` ``. Any other construct renders as
// literal text (fail-literal, never fail-open).
import { Fragment, type ReactNode } from 'react'

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/

export function renderInlineMarkdown(text: string, keyPrefix = 'i'): ReactNode[] {
  const nodes: ReactNode[] = []
  let nodeKey = 0
  for (const segment of text.split(INLINE_PATTERN)) {
    if (segment === '') continue
    // Positional keys are stable here: the renderer is pure over immutable
    // ratified text (same string in → same element list out), so the order
    // never changes across renders.
    const key = `${keyPrefix}-${nodeKey}`
    nodeKey += 1
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
      nodes.push(<strong key={key}>{segment.slice(2, -2)}</strong>)
    } else if (segment.startsWith('`') && segment.endsWith('`') && segment.length > 2) {
      nodes.push(<code key={key}>{segment.slice(1, -1)}</code>)
    } else {
      nodes.push(<Fragment key={key}>{segment}</Fragment>)
    }
  }
  return nodes
}

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/
const BULLET_PATTERN = /^\s*[-*]\s+/
const ORDERED_PATTERN = /^\s*\d+\.\s+/
const QUOTE_PATTERN = /^>\s?/
const FENCE_PATTERN = /^```/
const INDENT_PATTERN = /^\s+\S/

type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'quote'; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: 'fence'; readonly text: string }

function parseBlocks(text: string): readonly Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      index += 1
      continue
    }
    if (FENCE_PATTERN.test(line.trim())) {
      const body: string[] = []
      index += 1
      while (index < lines.length && !FENCE_PATTERN.test(lines[index].trim())) {
        body.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ kind: 'fence', text: body.join('\n') })
      continue
    }
    const heading = line.match(HEADING_PATTERN)
    if (heading !== null) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] })
      index += 1
      continue
    }
    if (QUOTE_PATTERN.test(line)) {
      const body: string[] = []
      while (index < lines.length && QUOTE_PATTERN.test(lines[index])) {
        body.push(lines[index].replace(QUOTE_PATTERN, ''))
        index += 1
      }
      blocks.push({ kind: 'quote', text: body.join(' ') })
      continue
    }
    if (BULLET_PATTERN.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const current = lines[index]
        if (BULLET_PATTERN.test(current)) {
          items.push(current.replace(BULLET_PATTERN, ''))
          index += 1
        } else if (INDENT_PATTERN.test(current) && items.length > 0) {
          items[items.length - 1] = `${items[items.length - 1]} ${current.trim()}`
          index += 1
        } else {
          break
        }
      }
      blocks.push({ kind: 'list', ordered: false, items })
      continue
    }
    if (ORDERED_PATTERN.test(line)) {
      const items: string[] = []
      while (index < lines.length) {
        const current = lines[index]
        if (ORDERED_PATTERN.test(current)) {
          items.push(current.replace(ORDERED_PATTERN, ''))
          index += 1
        } else if (INDENT_PATTERN.test(current) && items.length > 0) {
          items[items.length - 1] = `${items[items.length - 1]} ${current.trim()}`
          index += 1
        } else {
          break
        }
      }
      blocks.push({ kind: 'list', ordered: true, items })
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index]
      if (
        current.trim() === '' ||
        FENCE_PATTERN.test(current.trim()) ||
        HEADING_PATTERN.test(current) ||
        QUOTE_PATTERN.test(current) ||
        BULLET_PATTERN.test(current) ||
        ORDERED_PATTERN.test(current)
      ) {
        break
      }
      paragraph.push(current.trim())
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
  }
  return blocks
}

// Markdown headings render as styled paragraphs (not real h1–h6): the
// document outline and the AID-3564 focus contract stay with the app's own
// headings, and ratified `#` text stays visible without becoming a second
// "Exemplo trabalhado" heading for assistive tech and role queries.
export function StructuredMarkdown({ text, className }: { readonly text: string; readonly className?: string }) {
  const elements: ReactNode[] = []
  let blockKey = 0
  for (const block of parseBlocks(text)) {
    // Positional keys are stable here (pure function of immutable text).
    const key = `b-${blockKey}`
    blockKey += 1
    if (block.kind === 'heading') {
      elements.push(
        <p key={key} className={`practice-md-heading practice-md-h${block.level}`}>
          {renderInlineMarkdown(block.text, key)}
        </p>,
      )
    } else if (block.kind === 'paragraph') {
      elements.push(<p key={key}>{renderInlineMarkdown(block.text, key)}</p>)
    } else if (block.kind === 'quote') {
      elements.push(<blockquote key={key}>{renderInlineMarkdown(block.text, key)}</blockquote>)
    } else if (block.kind === 'fence') {
      elements.push(
        <pre key={key}>
          <code>{block.text}</code>
        </pre>,
      )
    } else {
      const items: ReactNode[] = []
      let itemKey = 0
      for (const item of block.items) {
        const itemKeyName = `${key}-${itemKey}`
        itemKey += 1
        items.push(<li key={itemKeyName}>{renderInlineMarkdown(item, itemKeyName)}</li>)
      }
      elements.push(block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>)
    }
  }
  return (
    <div className={className === undefined ? 'practice-markdown' : `practice-markdown ${className}`}>
      {elements}
    </div>
  )
}
