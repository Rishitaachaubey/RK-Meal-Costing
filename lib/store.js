import fs from "fs"; import path from "path";
const FILE = path.join(process.cwd(), "data", "db.json");
export const TABLES = ["zones","kitchens","units","materials","rates","items","recipes","demand","stock","expenses"];
const empty = () => Object.fromEntries(TABLES.map(t => [t, []]));
export function load() {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    try {
      d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "seed", "howrah.json"), "utf8"));
      if (!d.kitchens.length) d.kitchens.push({ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true });
    } catch {
      d = empty();
      d.units = ["KG","L","EA","GM","ML","portion"].map(c => ({ code: c, name: c }));
    }
    save(d);
  }
  for (const t of TABLES) d[t] ||= [];
  // in-memory migration of data saved by earlier versions (persisted on next save)
  for (const k of d.kitchens) { if (k.zone === undefined) k.zone = d.zones.find(z => z.id === k.zoneId)?.name || ""; k.code ||= String(k.id).toUpperCase(); if (k.active === undefined) k.active = true; }
  for (const m of d.materials) if (m.active === undefined) m.active = true;
  for (const s of d.stock) if (!s.date && s.periodStart && s.periodStart === s.periodEnd) { s.date = s.periodStart; s.id = `${s.kitchenId}|${s.date}|${s.materialCode}`; }
  return d;
}
export function save(d) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE + ".tmp", JSON.stringify(d, null, 1)); fs.renameSync(FILE + ".tmp", FILE); }
export const uid = () => Math.random().toString(36).slice(2, 10);
