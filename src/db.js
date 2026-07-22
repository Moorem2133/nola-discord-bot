import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('data/db.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Load initial data
let data = {};
if (fs.existsSync(DB_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse database file, resetting:', err.message);
  }
}

// Save helper
function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Database write error:', err.message);
  }
}

// Exportable wrapper
export const db = {
  get(key, defaultValue) {
    return data[key] !== undefined ? data[key] : defaultValue;
  },
  set(key, value) {
    data[key] = value;
    save();
  },
  delete(key) {
    delete data[key];
    save();
  },
  all() {
    return data;
  }
};
