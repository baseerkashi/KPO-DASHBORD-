import sqlite from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database will be stored in server/vertex.db
const dbPath = path.join(__dirname, 'vertex.db');
const db = sqlite(dbPath);

db.pragma('journal_mode = WAL'); // Better performance

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'analyst',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    company_name TEXT,
    industry TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    period_title TEXT,
    parsed_data TEXT,
    financials TEXT,
    risk_score TEXT,
    insights TEXT,
    advanced_analysis TEXT,
    validation_results TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add columns if missing (migration-safe)
try { db.exec("ALTER TABLE analyses ADD COLUMN advanced_analysis TEXT"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE analyses ADD COLUMN validation_results TEXT"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'analyst'"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN name TEXT"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT"); } catch(e) { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN reset_expires DATETIME"); } catch(e) { /* already exists */ }

// Seed default user for testing
const checkBen = db.prepare('SELECT id FROM users WHERE email = ?').get('ben');
if (!checkBen) {
  const defaultPass = bcrypt.hashSync('1234', 10);
  db.prepare('INSERT INTO users (id, email, password_hash, role, plan) VALUES (?, ?, ?, ?, ?)').run(
    'user_ben', 'ben', defaultPass, 'admin', 'enterprise'
  );
  console.log("Seeded default user 'ben' with password '1234' (admin, enterprise plan)");
}

export default db;
