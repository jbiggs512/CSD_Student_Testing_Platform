import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavBar } from '@/shared/components'
import { MemoryRouter } from 'react-router'

describe('NavBar', () => {
  it('renders the navigation bar', () => {
    const { container } = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(container.querySelector('#nav-bar')).not.toBeNull()
  })
})
