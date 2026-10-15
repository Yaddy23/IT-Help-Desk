import { connectDB } from './config/db.js'
import { initMailer } from './config/mailer.js'
import { env } from './config/env.js'
import { createApp } from './app.js'

async function main() {
  await connectDB()
  await initMailer()

  const app = createApp()
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
