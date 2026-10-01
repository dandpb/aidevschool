// AID-3643: unit invariants for the safe structured renderer of ratified
// learner-facing markdown. Safety model: React elements are built directly
// from the string — there is no HTML parsing, so hostile-looking input can
// only ever render as literal text. Fidelity model: markers are the only
// thing consumed; every ratified word must survive as text content.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StructuredMarkdown, renderInlineMarkdown } from './structuredMarkdown'

function textContentOf(ui: React.ReactElement): string {
  const { container } = render(ui)
  return container.textContent ?? ''
}

describe('renderInlineMarkdown', () => {
  it('renders bold and inline code as strong/code with the exact inner words', () => {
    const nodes = renderInlineMarkdown('mantenha **só** o que `fonte-1 L2` sustenta')
    const { container } = render(<p>{nodes}</p>)
    expect(container.querySelector('strong')?.textContent).toBe('só')
    expect(container.querySelector('code')?.textContent).toBe('fonte-1 L2')
    expect(container.textContent).toBe('mantenha só o que fonte-1 L2 sustenta')
  })

  it('emits no block elements (safe inside label/p/summary)', () => {
    const nodes = renderInlineMarkdown('a\nb **c**')
    const { container } = render(<span>{nodes}</span>)
    expect(container.querySelector('div')).toBeNull()
    expect(container.querySelector('ul')).toBeNull()
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders unbalanced or hostile markers as literal text, never as markup', () => {
    const hostile = '<script>alert(1)</script> **unclosed `backtick'
    const text = textContentOf(<p>{renderInlineMarkdown(hostile)}</p>)
    expect(text).toContain('<script>alert(1)</script>')
    expect(text).toContain('**unclosed `backtick')
  })
})

describe('StructuredMarkdown', () => {
  it('renders headings, paragraphs, lists, quotes, fences and inline marks', () => {
    const markdown = [
      '# Título',
      '',
      'Parágrafo com **negrito** e `código`.',
      '',
      '- item um',
      '- item dois com continuação',
      '  na linha seguinte',
      '',
      '1. primeiro',
      '2. segundo',
      '',
      '> citação do autor',
      '',
      '```',
      'bloco de evidência',
      '```',
    ].join('\n')
    const { container } = render(<StructuredMarkdown text={markdown} />)
    expect(container.querySelector('.practice-md-h1')?.textContent).toBe('Título')
    expect(container.querySelector('.practice-md-h1')?.tagName).toBe('P')
    expect(container.querySelectorAll('ul li').length).toBe(2)
    expect(container.querySelector('ul li:last-child')?.textContent).toBe('item dois com continuação na linha seguinte')
    expect(container.querySelectorAll('ol li').length).toBe(2)
    expect(container.querySelector('blockquote')?.textContent).toBe('citação do autor')
    expect(container.querySelector('pre code')?.textContent).toBe('bloco de evidência')
    expect(container.querySelector('strong')?.textContent).toBe('negrito')
    expect(container.querySelector('p code')?.textContent).toBe('código')
  })

  it('never renders literal ** markers and never injects HTML', () => {
    const markdown = '**Etapa C** com `<img src=x onerror=alert(1)>` dentro'
    const { container } = render(<StructuredMarkdown text={markdown} />)
    expect(container.textContent).not.toContain('**')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('renders a plain string as one paragraph (untouched surfaces look the same)', () => {
    const { container } = render(<StructuredMarkdown text="resumo simples sem marcação" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0]?.textContent).toBe('resumo simples sem marcação')
  })

  it('joins soft-wrapped lines of one paragraph before inline parsing (multi-line bold)', () => {
    const markdown = 'aviso com **incerteza\ndita claramente** no grupo'
    const { container } = render(<StructuredMarkdown text={markdown} />)
    expect(container.querySelector('strong')?.textContent).toBe('incerteza dita claramente')
    expect(container.textContent).toBe('aviso com incerteza dita claramente no grupo')
  })
})
