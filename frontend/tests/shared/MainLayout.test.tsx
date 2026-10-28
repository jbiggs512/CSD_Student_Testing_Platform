import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MainLayout } from '@/shared/components/MainLayout'
import { MemoryRouter } from 'react-router'

describe('MainLayout', () => {
  it('renders the main layout', () => {
    const { container } = render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );
    expect(container.querySelector('#main-layout')).not.toBeNull()
  })
})
