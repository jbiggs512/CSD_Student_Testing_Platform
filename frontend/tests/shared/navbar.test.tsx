import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavBar } from '@/shared/components'
import { MemoryRouter } from 'react-router'

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  )
}

describe('NavBar', () => {
  it('renders the navigation bar', () => {
    const { container } = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(container.querySelector('#nav-bar')).not.toBeNull()
  })

  it('contains links to the student pages', () => {
    const { getAllByRole } = renderNavBar()
    getAllByRole('link', { name: 'Dashboard' }).forEach((link) => {
      expect(link.getAttribute('href')).toBe('/dashboard')
    })
    getAllByRole('link', { name: 'Leaderboards' }).forEach((link) => {
      expect(link.getAttribute('href')).toBe('/leaderboards')
    })
    getAllByRole('link', { name: 'Statistics' }).forEach((link) => {
      expect(link.getAttribute('href')).toBe('/statistics')
    })
    getAllByRole('link', { name: 'Profile' }).forEach((link) => {
      expect(link.getAttribute('href')).toBe('/profile')
    })
  })
})
