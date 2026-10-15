/**
 * User store — a small, swappable persistence layer.
 *
 * For Phase 1 we persist users to a JSON file under `data/`. The public
 * interface (`createUser`, `findByEmail`, `findById`) is intentionally
 * database-agnostic: to move to Postgres/Mongo/SQLite later you only replace
 * this module, not the routes.
 *
 * NOTE: this is fine for local development and small deployments. For serious
 * production traffic, back it with a real database and unique indexes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

const DB_FILE = path.join(config.dataDir, 'users.json');
const BCRYPT_ROUNDS = 12;

/** In-memory cache + a write queue to serialise file writes. */
let users = null;
let writeChain = Promise.resolve();

async function load() {
  if (users) return users;
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    users = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      users = [];
      await fs.mkdir(config.dataDir, { recursive: true });
      await persist();
    } else {
      throw err;
    }
  }
  return users;
}

/** Persist atomically (write temp file, then rename) to avoid corruption. */
function persist() {
  writeChain = writeChain.then(async () => {
    await fs.mkdir(config.dataDir, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(users, null, 2), 'utf8');
    await fs.rename(tmp, DB_FILE);
  });
  return writeChain;
}

/** Strip the password hash before returning a user to callers. */
function toPublic(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export const userStore = {
  async findByEmail(email) {
    const list = await load();
    const lower = email.toLowerCase();
    return list.find((u) => u.email === lower) || null;
  },

  async findById(id) {
    const list = await load();
    return list.find((u) => u.id === id) || null;
  },

  async findByUsername(username) {
    const list = await load();
    const lower = username.toLowerCase();
    return list.find((u) => u.username.toLowerCase() === lower) || null;
  },

  /**
   * Create a user. Throws `{ code: 'EMAIL_TAKEN' | 'USERNAME_TAKEN' }` on clash.
   */
  async createUser({ email, username, password }) {
    const list = await load();
    const lowerEmail = email.toLowerCase();

    if (list.some((u) => u.email === lowerEmail)) {
      const e = new Error('Email already registered.');
      e.code = 'EMAIL_TAKEN';
      throw e;
    }
    if (list.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      const e = new Error('Username already taken.');
      e.code = 'USERNAME_TAKEN';
      throw e;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id: crypto.randomUUID(),
      email: lowerEmail,
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      // Preferences used by the UI (e.g. the ad-blocker onboarding banner).
      prefs: { adBlockNoticeSeen: false, theme: 'dark' },
    };
    list.push(user);
    await persist();
    return toPublic(user);
  },

  /** Verify credentials. Returns the public user or `null`. */
  async verifyCredentials(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? toPublic(user) : null;
  },

  /** Update a user's preferences. */
  async updatePrefs(id, patch) {
    const list = await load();
    const user = list.find((u) => u.id === id);
    if (!user) return null;
    user.prefs = { ...user.prefs, ...patch };
    await persist();
    return toPublic(user);
  },

  toPublic,
};
