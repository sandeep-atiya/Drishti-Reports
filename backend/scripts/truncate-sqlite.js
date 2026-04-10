import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/reports_cache.db');

const db = new Database(dbPath);

try {
  db.pragma('journal_mode = WAL');
  db.exec(`
    DELETE FROM calls_daily;
    DELETE FROM orders_daily;
    DELETE FROM transfer_daily;
    DELETE FROM hangup_daily;
    DELETE FROM sync_meta;
    VACUUM;
  `);

  console.log(`[clean:sqlite] SQLite cache truncated: ${dbPath}`);
} catch (error) {
  console.error(`[clean:sqlite] Failed to truncate SQLite cache: ${error.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
