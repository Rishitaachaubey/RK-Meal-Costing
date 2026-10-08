import fs from "fs";
import path from "path";

const FILE_LOCAL = path.join(process.cwd(), "data", "db.json");
const FILE_TMP = path.join("/tmp", "db.json");

export const TABLES = ["zones","kitchens","units","materials","rates","items","recipes","demand","stock","expenses"];
const empty = () => Object.fromEntries(TABLES.map(t => [t, []]));

export function load() {
  let d;
  if (globalThis._dbCache) {
    d = globalThis._dbCache;
  } else {
    try {
      d = JSON.parse(fs.readFileSync(FILE_LOCAL, "utf8"));
    } catch {
      try {
        d = JSON.parse(fs.readFileSync(FILE_TMP, "utf8"));
      } catch {
        try {
          d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "seed", "howrah.json"), "utf8"));
        } catch {
          d = empty();
          d.units = ["KG","L","EA","GM","ML","portion"].map(c => ({ code: c, name: c }));
        }
      }
    }
  }

  for (const t of TABLES) d[t] ||= [];

  // Guarantee default Howrah kitchen exists if kitchens is empty
  if (!d.kitchens || d.kitchens.length === 0) {
    d.kitchens = [{ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true }];
  }

  for (const k of d.kitchens) {
    if (k.zone === undefined) k.zone = d.zones.find(z => z.id === k.zoneId)?.name || "East";
    k.code ||= String(k.id).toUpperCase();
    if (k.active === undefined) k.active = true;
  }
  for (const m of d.materials) if (m.active === undefined) m.active = true;
  for (const s of d.stock) if (!s.date && s.periodStart && s.periodStart === s.periodEnd) { s.date = s.periodStart; s.id = `${s.kitchenId}|${s.date}|${s.materialCode}`; }

  globalThis._dbCache = d;
  return d;
}

export function save(d) {
  globalThis._dbCache = d;
  try {
    fs.mkdirSync(path.dirname(FILE_LOCAL), { recursive: true });
    fs.writeFileSync(FILE_LOCAL + ".tmp", JSON.stringify(d, null, 1));
    fs.renameSync(FILE_LOCAL + ".tmp", FILE_LOCAL);
  } catch (err) {
    // Read-only filesystem on Vercel lambda - fallback to /tmp
    try {
      fs.writeFileSync(FILE_TMP, JSON.stringify(d, null, 1));
    } catch (e) {}
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);
