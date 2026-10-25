import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/pages/login'

describe('LoginPage', () => {
  it('renders the login page heading', () => {
    const { getByText } = render(<LoginPage />)
    expect(getByText('Login Page')).toBeDefined()
  })
})

