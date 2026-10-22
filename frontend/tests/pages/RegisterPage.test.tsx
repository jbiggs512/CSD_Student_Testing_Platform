import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegisterPage } from '@/pages/register'

describe('RegisterPage', () => {
  it('renders the register page heading', () => {
    const { getByText } = render(<RegisterPage />)
    expect(getByText('Register Page')).toBeDefined()
  })
})

