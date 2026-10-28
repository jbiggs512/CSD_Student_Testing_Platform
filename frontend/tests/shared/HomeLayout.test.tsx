import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeLayout } from '@/shared/components/HomeLayout'

describe('HomeLayout', () => {
  it('renders the home layout', () => {
    const { container } = render(<HomeLayout />)
    expect(container.querySelector('#home-layout')).not.toBeNull()
  })
})
