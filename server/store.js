/* JSON file store with atomic, debounced writes.
   One file (data/cms.json) holds content, settings, submissions, users and sessions.
   Fine for a single hospital site; swap for a real database if traffic grows. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class Store {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.timer = null;
  }

  load(seedFn) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return false;
    }
    this.data = seedFn();
    this.flush();
    return true;
  }

  /** Mark dirty; writes at most every 250 ms. */
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 250);
  }

  flush() {
    const tmp = this.file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }

  /** Daily backup copy, keeps the last 14. */
  backup() {
    const dir = path.join(path.dirname(this.file), "backups");
    fs.mkdirSync(dir, { recursive: true });
    const name = "cms-" + new Date().toISOString().slice(0, 10) + ".json";
    const dest = path.join(dir, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(this.file, dest);
    const all = fs.readdirSync(dir).filter((f) => f.startsWith("cms-")).sort();
    while (all.length > 14) fs.unlinkSync(path.join(dir, all.shift()));
  }
}

const newId = () => crypto.randomBytes(8).toString("hex");

module.exports = { Store, newId };
