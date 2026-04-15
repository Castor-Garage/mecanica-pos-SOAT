import 'dotenv/config'
import { buildServer } from './infrastructure/http/server.js'

const app = buildServer()

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
