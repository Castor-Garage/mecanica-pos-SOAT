import { it, expect } from 'vitest'
it('DATABASE_URL points to test db', () => {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  expect(process.env.DATABASE_URL).toContain('mecanica_test_db')
})
