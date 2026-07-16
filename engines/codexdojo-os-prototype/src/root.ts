export class RootElementMissingError extends Error {
  constructor() {
    super('Could not mount codexDojo OS. Missing element: #root')
    this.name = 'RootElementMissingError'
  }
}

export function requireRootElement(source: Document): HTMLElement {
  const root = source.querySelector('#root')
  if (!(root instanceof HTMLElement)) throw new RootElementMissingError()
  return root
}
