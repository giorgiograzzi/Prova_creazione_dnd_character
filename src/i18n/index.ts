import it from './it.json'

// Unica sorgente dei testi dell'interfaccia (niente testo hardcoded nei componenti).
// Uso: t('app.title'). Se la chiave manca, restituisce la chiave stessa (si nota subito).
export function t(key: string): string {
  let cur: unknown = it
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return key
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : key
}
