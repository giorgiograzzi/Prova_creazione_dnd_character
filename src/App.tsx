import { t } from './i18n'

// Segnaposto: il tema XP e la tab bar arrivano allo step 12.
export function App() {
  return (
    <main style={{ padding: 16, fontFamily: 'Tahoma, Verdana, sans-serif', fontSize: 16 }}>
      <h1>{t('app.title')}</h1>
      <p>{t('app.placeholder')}</p>
    </main>
  )
}
