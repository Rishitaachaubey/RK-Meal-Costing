import { NextResponse } from "next/server"; import fs from "fs"; import path from "path"; import { load, save, uid } from "@/lib/store"; import { plan } from "@/lib/engine";
const seed = () => JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/seed/howrah.json"), "utf8"));
export async function GET() { const s = seed(); return NextResponse.json({ review: s.review, counts: { items: s.items.length, materials: s.materials.length, recipes: s.recipes.length, demand: s.demand.length } }); }
// Additive + idempotent: never overwrites or deletes existing data.
export async function POST(req) {
  const { part, date } = await req.json(); const s = seed(); const d = load(); const added = {};
  if (part === "masters") {
    if (!d.kitchens.find(k => k.id === "k-howrah")) d.kitchens.push({ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true });
    const add = (t, rows, key) => { let n = 0; for (const r of rows) if (!d[t].some(x => key(x) === key(r))) { d[t].push(r); n++; } added[t] = n; };
    add("materials", s.materials, x => x.code);
    add("items", s.items, x => x.code);
    add("units", [...new Set(s.materials.map(m => m.unit).concat(s.recipes.map(r => r.unit)))].filter(Boolean).map(u => ({ code: u, name: u })), x => x.code);
    if (!date) return NextResponse.json({ error: "Choose the date rates and recipes take effect from." }, { status: 400 });
    add("rates", s.rates.map(r => ({ id: uid(), materialCode: r.materialCode, kitchenId: "", rate: r.rate, effectiveFrom: date, imported: true })).filter(r => r.rate != null), x => x.materialCode + "|" + x.effectiveFrom + "|" + x.kitchenId);
    add("recipes", s.recipes.map(r => ({ id: `hw-${r.parentCode}-${r.componentCode}-${r.source.replace(/\W/g,"")}`, ...r, kitchenId: "", effectiveFrom: date, effectiveTo: "" })), x => x.id);
  } else if (part === "demand") {
    if (!date) return NextResponse.json({ error: "Choose a service date first." }, { status: 400 });
    let n = 0;
    for (const r of s.demand) if (!d.demand.some(x => x.date === date && x.kitchenId === "k-howrah" && x.itemCode === r.itemCode)) { d.demand.push({ id: uid(), date, kitchenId: "k-howrah", itemCode: r.itemCode, qty: r.qty, note: "Workbook total (Aug) — date chosen at import" }); n++; }
    added.demand = n;
  } else if (part === "demo") {
    if (!date) return NextResponse.json({ error: "Choose a service date first." }, { status: 400 });
    const K = "k-howrah";
    if (!d.kitchens.find(k => k.id === K)) d.kitchens.push({ id: K, code: "HWH", name: "Howrah", zone: "East", active: true });
    const M = [["DM01","Basmati Rice (DEMO)","KG",95],["DM02","Soyabean Oil (DEMO)","L",130],["DM03","Jeera (DEMO)","KG",350],["DM04","Salt (DEMO)","KG",12],["DM05","Arhar Dal (DEMO)","KG",140],["DM06","Onion (DEMO)","KG",30],["DM07","Tomato (DEMO)","KG",40],["DM08","Chilli Powder (DEMO)","KG",280],["DM09","Haldi Powder (DEMO)","KG",180],["DM10","Potato (DEMO)","KG",25],["DM11","Green Peas (DEMO)","KG",90],["DM12","Casserole 210ml (DEMO)","EA",1.8],["DM13","Lid 210ml (DEMO)","EA",0.7]];
    for (const [code, name, unit, rate] of M) { if (!d.materials.some(x => x.code === code)) d.materials.push({ code, name, unit, active: true }); if (!d.units.some(u => u.code === unit)) d.units.push({ code: unit, name: unit }); if (!d.rates.some(r => r.materialCode === code)) d.rates.push({ id: uid(), materialCode: code, kitchenId: "", rate, effectiveFrom: date, imported: true, demo: true }); }
    const I = [["DEMO-01","Jeera Rice (DEMO)","FG","Lunch & Dinner","portion"],["DEMO-02","Dal Tadka (DEMO)","FG","Lunch & Dinner","portion"],["DEMO-03","Aloo Matar (DEMO)","FG","Lunch & Dinner","portion"],["DEMO-SFG1","Onion-Tomato Gravy (DEMO)","SFG","Lunch & Dinner","KG"]];
    for (const [code, name, type, group, unit] of I) if (!d.items.some(x => x.code === code)) d.items.push({ code, name, type, group, unit, active: true });
    const R = [["DEMO-01","DM01",100,12,"KG"],["DEMO-01","DM02",100,0.6,"L"],["DEMO-01","DM03",100,0.3,"KG"],["DEMO-01","DM04",100,0.2,"KG"],["DEMO-01","DM12",100,100,"EA"],["DEMO-01","DM13",100,100,"EA"],
      ["DEMO-02","DM05",100,8,"KG"],["DEMO-02","DM02",100,0.8,"L"],["DEMO-02","DM06",100,3,"KG"],["DEMO-02","DM07",100,3,"KG"],["DEMO-02","DM08",100,0.15,"KG"],["DEMO-02","DM09",100,0.1,"KG"],["DEMO-02","DM03",100,0.1,"KG"],["DEMO-02","DM04",100,0.3,"KG"],["DEMO-02","DM12",100,100,"EA"],["DEMO-02","DM13",100,100,"EA"],
      ["DEMO-SFG1","DM06",10,6,"KG"],["DEMO-SFG1","DM07",10,4,"KG"],["DEMO-SFG1","DM02",10,0.5,"L"],["DEMO-SFG1","DM08",10,0.1,"KG"],
      ["DEMO-03","DM10",100,10,"KG"],["DEMO-03","DM11",100,3,"KG"],["DEMO-03","DM04",100,0.2,"KG"],["DEMO-03","DM12",100,100,"EA"],["DEMO-03","DM13",100,100,"EA"]];
    for (const [pc, cc, basisQty, qty, unit] of R) { const id = `demo-${pc}-${cc}`; if (!d.recipes.some(x => x.id === id)) d.recipes.push({ id, parentCode: pc, componentType: "MATERIAL", componentCode: cc, basisQty, qty, unit, effectiveFrom: date, effectiveTo: "", kitchenId: "" }); }
    const gid = "demo-DEMO-03-gravy"; if (!d.recipes.some(x => x.id === gid)) d.recipes.push({ id: gid, parentCode: "DEMO-03", componentType: "SFG", componentCode: "DEMO-SFG1", basisQty: 100, qty: 8, unit: "KG", effectiveFrom: date, effectiveTo: "", kitchenId: "" });
    for (const [c, q] of [["DEMO-01", 500], ["DEMO-02", 500], ["DEMO-03", 300]]) if (!d.demand.some(x => x.date === date && x.kitchenId === K && x.itemCode === c)) d.demand.push({ id: uid(), date, kitchenId: K, itemCode: c, qty: q, note: "Sample demand (DEMO)" });
    // sample stock: actual use = ideal + 6%
    const ideal = plan(d, { from: date, to: date, kitchenId: K });
    for (const m of ideal.mat.filter(m => m.code.startsWith("DM"))) { const id = `${K}|${date}|${m.code}`; if (d.stock.some(x => x.id === id)) continue; const opening = Math.ceil(m.qty * 3), used = m.qty * 1.06; d.stock.push({ id, kitchenId: K, date, materialCode: m.code, opening, purchases: 0, closing: +(opening - used).toFixed(3) }); }
    added.demo = "3 menu items, 1 prep item, 13 materials, sample demand and stock";
  }
  save(d); return NextResponse.json({ added, db: d });
}
