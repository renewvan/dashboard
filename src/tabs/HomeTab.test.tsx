import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeTab } from './HomeTab'

describe('HomeTab', () => {
  it('renders nothing', () => {
    const { container } = render(<HomeTab />)
    expect(container).toBeEmptyDOMElement()
  })
})
