import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.')
}

const pool = mysql.createPool(process.env.DATABASE_URL)

export const db = drizzle(pool, { schema, mode: 'default' })
