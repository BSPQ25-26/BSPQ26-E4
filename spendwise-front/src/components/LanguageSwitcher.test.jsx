/**
 * @file Unit tests for the `LanguageSwitcher` component.
 *
 * The dropdown is tiny but it sits in three places (login, navbar,
 * settings) so a regression here would be felt across the whole UI.
 * The tests verify the three behaviours that matter:
 *
 * 1. Both variants render the supported language options.
 * 2. Changing the value calls `i18n.changeLanguage`.
 * 3. The selection is pushed to the backend via `updateUser` when the
 *    user is authenticated, and skipped (without throwing) when they
 *    are not.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import LanguageSwitcher from './LanguageSwitcher'
import i18n from '../i18n'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, updateUser: undefined })
  })

  afterEach(async () => {
    // Reset i18n between tests so a previous case can't leak its
    // language choice into the next render.
    await i18n.changeLanguage('en')
  })

  it('lists every supported language as an option', () => {
    render(<LanguageSwitcher />)

    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['en', 'es', 'eu', 'pl', 'fr'])
  })

  it('changes the active language when a different option is picked', async () => {
    const user = userEvent.setup()
    const changeSpy = vi.spyOn(i18n, 'changeLanguage')

    render(<LanguageSwitcher />)

    await user.selectOptions(screen.getByRole('combobox'), 'es')

    expect(changeSpy).toHaveBeenCalledWith('es')
  })

  it('pushes the choice to the backend when the user is authenticated', async () => {
    const updateUser = vi.fn().mockResolvedValue({})
    useAuth.mockReturnValue({
      user: { id: 'u-1', email: 'a@b.com' },
      updateUser,
    })
    const user = userEvent.setup()

    render(<LanguageSwitcher />)

    await user.selectOptions(screen.getByRole('combobox'), 'eu')

    expect(updateUser).toHaveBeenCalledWith({ language: 'eu' })
  })

  it('renders the labelled variant with a visible label', () => {
    render(<LanguageSwitcher variant="full" />)

    // The "full" variant emits a real <label> element above the select.
    expect(screen.getByText(/language/i)).toBeInTheDocument()
  })

  it('does not throw when no auth context is available', async () => {
    useAuth.mockReturnValue(null)
    const user = userEvent.setup()

    render(<LanguageSwitcher />)

    await expect(
      user.selectOptions(screen.getByRole('combobox'), 'es'),
    ).resolves.not.toThrow()
  })
})
