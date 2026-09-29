import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from '../engine'
import { t } from '../i18n'

describe('setup', () => {
  it('il motore si importa senza UI', () => {
    expect(ENGINE_VERSION).toBe(0)
  })
  it('i18n risolve le chiavi e segnala quelle mancanti', () => {
    expect(t('app.title')).toBe('Schede D&D')
    expect(t('non.esiste')).toBe('non.esiste')
  })
})
