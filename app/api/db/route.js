import { NextResponse } from "next/server"; import { load, save, uid, TABLES } from "@/lib/store";
const KEY = { kitchens: "id", units: "code", materials: "code", items: "code" };
const bad = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
export async function GET() { return NextResponse.json(load()); }
export async function POST(req) {
  const b = await req.json(); const d = load(); const { op, table } = b;
  if (op === "saveDemand") { // replaces one kitchen + date
    if (!b.kitchenId || !b.date) return bad("Choose a kitchen and a date.");
    d.demand = d.demand.filter(x => !(x.kitchenId === b.kitchenId && x.date === b.date));
    for (const r of b.rows) if (+r.qty > 0) d.demand.push({ id: `${b.kitchenId}|${b.date}|${r.itemCode}`, kitchenId: b.kitchenId, date: b.date, itemCode: r.itemCode, qty: +r.qty });
    save(d); return NextResponse.json(d);
  }
  if (op === "saveStock") { // replaces one kitchen + date
    if (!b.kitchenId || !b.date) return bad("Choose a kitchen and a date.");
    d.stock = d.stock.filter(x => !(x.kitchenId === b.kitchenId && x.date === b.date));
    for (const r of b.rows) if ([r.opening, r.purchases, r.closing].some(v => v !== "" && v != null)) d.stock.push({ id: `${b.kitchenId}|${b.date}|${r.materialCode}`, kitchenId: b.kitchenId, date: b.date, materialCode: r.materialCode, opening: r.opening, purchases: r.purchases, closing: r.closing });
    save(d); return NextResponse.json(d);
  }
  if (!TABLES.includes(table)) return bad("bad table");
  const k = KEY[table] || "id";
  for (const r0 of b.rows || [b.row]) {
    const r = { ...r0 };
    if (op === "delete") {
      if (table === "materials" && d.recipes.some(x => x.componentType === "MATERIAL" && x.componentCode === r.code)) return bad("This material is used in recipes. Remove those recipe lines first.", 409);
      if (table === "items" && (d.recipes.some(x => x.parentCode === r.code || (x.componentType === "SFG" && x.componentCode === r.code)) || d.demand.some(x => x.itemCode === r.code))) return bad("This item has recipes or demand. Remove those first, or set it to inactive.", 409);
      if (table === "kitchens" && d.demand.some(x => x.kitchenId === r.id)) return bad("This kitchen has meal demand. Set it to inactive instead.", 409);
      d[table] = d[table].filter(x => x[k] !== r[k]); continue;
    }
    if (!r[k]) r[k] = uid();
    if (table === "materials" || table === "items") r.code = String(r.code).trim().toUpperCase();
    if (table === "kitchens") r.code = String(r.code).trim().toUpperCase();
    const i = d[table].findIndex(x => x[k] === r[k]);
    if (["materials","items","units"].includes(table) && d[table].some(x => x.code === r.code && x[k] !== r[k])) return bad(`Code ${r.code} already exists.`, 409);
    if (table === "kitchens" && d.kitchens.some(x => x.code === r.code && x.id !== r.id)) return bad(`Kitchen code ${r.code} already exists.`, 409);
    if (i >= 0 && op === "create") return bad(`${table === "kitchens" ? "Kitchen code" : "Code"} ${r.code || r[k]} already exists. Use Edit on the existing row instead.`, 409);
    if (i >= 0) d[table][i] = { ...d[table][i], ...r }; else d[table].push(r);
  }
  save(d); return NextResponse.json(d);
}
