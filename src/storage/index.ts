import Database from 'better-sqlite3';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { AppError, hash, scopeKey, type Context } from '../domain/index.js';
export type Operation = { ref: string; scope: string; tool: string; key: string; digest: string; payload: string; state: string; result: string | null; approved_until: number | null; created: number };
export class Store {
  readonly db: Database.Database;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new Database(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS operations(ref TEXT PRIMARY KEY, scope TEXT NOT NULL, tool TEXT NOT NULL, key TEXT NOT NULL, digest TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, result TEXT, approved_until INTEGER, created INTEGER NOT NULL, UNIQUE(scope,tool,key));
      CREATE TABLE IF NOT EXISTS cursors(id TEXT PRIMARY KEY, scope TEXT NOT NULL, binding TEXT NOT NULL, value TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS secrets(id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_tasks(id TEXT PRIMARY KEY, list_id TEXT NOT NULL, value TEXT NOT NULL);`);
    // A model may choose a descriptive key, so the ledger keeps only its digest.
    if ((this.db.pragma('user_version',{simple:true}) as number) < 1) {
      this.db.transaction(()=>{
        const update=this.db.prepare('UPDATE operations SET key=? WHERE ref=?');
        // A logical restore loses user_version; hashing twice would silently defeat replay protection.
        for (const row of this.db.prepare('SELECT ref,key FROM operations').all() as {ref:string;key:string}[]) if (!/^[a-f0-9]{64}$/.test(row.key)) update.run(hash(row.key),row.ref);
        this.db.pragma('user_version=1');
      })();
    }

  }
  proposal(ctx: Context, tool: string, rawKey: string, payload: unknown): Operation {
    const scope = scopeKey(ctx), digest = hash(payload), key = hash(rawKey);
    this.db.prepare("INSERT OR IGNORE INTO operations(ref,scope,tool,key,digest,payload,state,created) VALUES(?,?,?,?,?,?,'pending',?)")
      .run(randomBytes(24).toString('hex'), scope, tool, key, digest, JSON.stringify(payload), Date.now());
    const row = this.db.prepare('SELECT * FROM operations WHERE scope=? AND tool=? AND key=?').get(scope, tool, key) as Operation;
    if (row.digest !== digest) throw new AppError('IDEMPOTENCY_CONFLICT', '相同操作 key 的內容已改變，拒絕執行。');
    return row;
  }
  approve(ref: string, now = Date.now()) {
    const changed = this.db.prepare("UPDATE operations SET approved_until=? WHERE ref=? AND state='pending' AND created>?").run(now + 300_000, ref, now - 86_400_000);
    if (!changed.changes) throw new AppError('APPROVAL_INVALID', '提案不存在、過期或已處理。');
  }
  approveBound(ctx: Context, ref: string, digest: string, now = Date.now()) {
    const changed=this.db.prepare("UPDATE operations SET approved_until=? WHERE ref=? AND scope=? AND digest=? AND state='pending' AND created>? AND created<=?")
      .run(now+300_000,ref,scopeKey(ctx),digest,now-86_400_000,now);
    if (!changed.changes) throw new AppError('APPROVAL_INVALID','核准與帳號、提案或內容不符，或提案已處理。');
  }
  operation(ctx: Context, ref: string): Operation | undefined {
    return this.db.prepare('SELECT * FROM operations WHERE ref=? AND scope=?').get(ref, scopeKey(ctx)) as Operation | undefined;
  }
  // Refusal is durable: the same key can never be approved or dispatched afterwards.
  reject(ctx: Context, ref: string, digest: string) {
    const changed=this.db.prepare("UPDATE operations SET state='failed_definitive',approved_until=NULL,payload='{}' WHERE ref=? AND scope=? AND digest=? AND state='pending'").run(ref,scopeKey(ctx),digest);
    if (!changed.changes) throw new AppError('APPROVAL_INVALID','提案不存在、內容不符或已處理。');
  }
  // Google Tasks is the only store of task content (D040). A proposal keeps its content only
  // while awaiting a decision; digest, state and IDs remain to refuse replays.
  redact(ref: string) { this.db.prepare("UPDATE operations SET payload='{}' WHERE ref=?").run(ref); }
  expireProposals(now = Date.now()) {
    this.db.prepare("UPDATE operations SET state='expired',approved_until=NULL,payload='{}' WHERE state='pending' AND created<=? AND tool IN ('create_task','update_task','complete_task')").run(now-86_400_000);
  }
  scrubFinished() {
    this.db.prepare("UPDATE operations SET payload='{}',result=NULL WHERE tool IN ('authorized_crud_step','authorized_conditional_step')").run();
    this.db.prepare("UPDATE operations SET payload='{}' WHERE state<>'pending' AND tool IN ('create_task','update_task','complete_task')").run();
  }
  claim(ref: string, now = Date.now()): boolean {
    return !!this.db.prepare("UPDATE operations SET state='in_flight',approved_until=NULL WHERE ref=? AND state='pending' AND approved_until>?").run(ref, now).changes;
  }
  finish(ref: string, state: string, result?: unknown) {
    this.db.prepare('UPDATE operations SET state=?, result=? WHERE ref=?').run(state, result === undefined ? null : JSON.stringify(result), ref);
  }
  cursor(ctx: Context, binding: unknown, value: unknown) {
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('DELETE FROM cursors WHERE expires<?').run(Date.now());
    this.db.prepare('INSERT INTO cursors VALUES(?,?,?,?,?)').run(token, scopeKey(ctx), hash(binding), JSON.stringify(value), Date.now() + 900_000);
    return token;
  }
  readCursor<T>(ctx: Context, binding: unknown, token: string): T {
    const row = this.db.prepare('SELECT value FROM cursors WHERE id=? AND scope=? AND binding=? AND expires>?').get(token, scopeKey(ctx), hash(binding), Date.now()) as {value:string} | undefined;
    if (!row) throw new AppError('INVALID_CURSOR', '續頁憑證無效、過期或不屬於此查詢。');
    return JSON.parse(row.value) as T;
  }
  recoverInterrupted() { this.db.prepare("UPDATE operations SET state='uncertain' WHERE state='in_flight'").run(); }
  close() { this.db.close(); }
}
export class EncryptedVault {
  constructor(private store: Store, private key: Buffer) { if (key.length !== 32) throw new Error('Vault key must be 32 bytes'); }
  put(id: string, value: unknown) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    this.store.db.prepare('INSERT OR REPLACE INTO secrets VALUES(?,?)').run(id, Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64'));
  }
  get<T>(id: string): T | undefined {
    const row = this.store.db.prepare('SELECT value FROM secrets WHERE id=?').get(id) as {value:string} | undefined;
    if (!row) return undefined;
    const bytes = Buffer.from(row.value, 'base64'), cipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0,12));
    cipher.setAuthTag(bytes.subarray(12,28));
    return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString()) as T;
  }
}
