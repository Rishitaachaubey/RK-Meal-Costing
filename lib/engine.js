// Pure planning engine (runs in the browser). Never guesses: problems go to issues[].
export const GROUPS = ["Breakfast","Lunch & Dinner","Hi-Tea","Extra Paratha","Base Staff Food","TT Staff Food","Train Staff Food"];
const N = v => (Number.isFinite(+v) ? +v : 0);
const eff = (r, date) => r.effectiveFrom <= date && (!r.effectiveTo || r.effectiveTo >= date);
const latest = l => l.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
export function rateFor(db, code, kitchenId, date) {
  const c = db.rates.filter(r => r.materialCode === code && r.effectiveFrom <= date && N(r.rate) > 0);
  return (latest(c.filter(r => r.kitchenId === kitchenId)) || latest(c.filter(r => !r.kitchenId)))?.rate ?? null;
}
export function directFor(db, group, kitchenId, date) {
  const c = db.expenses.filter(x => x.serviceGroup === group && x.effectiveFrom <= date);
  const e = latest(c.filter(x => x.kitchenId === kitchenId)) || latest(c.filter(x => !x.kitchenId));
  return e ? N(e.amount) : 0;
}
function linesFor(db, code, kitchenId, date) {
  const all = db.recipes.filter(r => r.parentCode === code && eff(r, date));
  const own = all.filter(r => r.kitchenId === kitchenId);
  return own.length ? own : all.filter(r => !r.kitchenId);
}
function explode(db, rows, out, issue) {
  const items = Object.fromEntries(db.items.map(i => [i.code, i])), mats = Object.fromEntries(db.materials.map(m => [m.code, m]));
  const walk = (code, qty, group, kitchenId, date, root, stack) => {
    const lines = linesFor(db, code, kitchenId, date); const rf = out.fg[root];
    if (!lines.length) { if (rf) rf.gaps = (rf.gaps || 0) + 1; return issue("missing-recipe", `No recipe for ${items[code]?.name || code} (${code}) on ${date}`, code); }
    for (const l of lines) {
      const basis = N(l.basisQty), per = N(l.qty), cname = (l.componentType === "SFG" ? items : mats)[l.componentCode]?.name || l.componentCode;
      if (basis <= 0) { if (rf) rf.gaps = (rf.gaps || 0) + 1; issue("invalid-basis", `${items[code]?.name || code}: recipe line for ${cname} has no valid portion basis`, code + l.componentCode); continue; }
      const need = qty / basis * per;
      if (l.componentType === "SFG") {
        const s = items[l.componentCode]; if (!s) { issue("missing-item", `Unknown prep item ${l.componentCode}`, l.componentCode); continue; }
        if (stack.includes(l.componentCode)) { issue("loop", `Recipe loop at ${s.name}`, l.componentCode); continue; }
        if (l.unit && s.unit && l.unit.toUpperCase() !== s.unit.toUpperCase()) issue("unit-mismatch", `${s.name}: recipe uses ${l.unit}, prep item is in ${s.unit}; no conversion set`, l.componentCode);
        const o = (out.sfg[s.code] ||= { code: s.code, name: s.name, unit: s.unit, qty: 0, usedBy: new Set() }); o.qty += need; o.usedBy.add(items[root]?.name || root);
        walk(l.componentCode, need, group, kitchenId, date, root, [...stack, l.componentCode]);
      } else {
        const m = mats[l.componentCode]; if (!m) { issue("missing-material", `Unknown material ${l.componentCode}`, l.componentCode); continue; }
        const o = (out.mat[m.code] ||= { code: m.code, name: m.name, unit: m.unit, qty: 0, value: 0, valued: 0, byGroup: {} });
        const mism = l.unit && m.unit && l.unit.toUpperCase() !== m.unit.toUpperCase();
        if (mism) { issue("unit-mismatch", `${m.name}: recipes use ${l.unit} but the material unit is ${m.unit}. Quantity shown in the recipe unit; value left out until a conversion is set`, m.code); (o.recipeUnits ||= new Set()).add(l.unit); }
        const rate = mism ? null : rateFor(db, m.code, kitchenId, date);
        o.qty += need; o.byGroup[group] = (o.byGroup[group] || 0) + need;
        if (mism) { if (rf) rf.gaps = (rf.gaps || 0) + 1; }
        else if (rate == null) { issue("missing-rate", `No rate for ${m.name} (${m.code}) on ${date}`, m.code); if (rf) rf.gaps = (rf.gaps || 0) + 1; }
        else { o.value += need * rate; o.valued += need; if (rf) rf.value = (rf.value || 0) + need * rate; }
      }
    }
  };
  for (const r of rows) {
    const it = items[r.itemCode], q = N(r.qty);
    if (!it) { issue("missing-item", `Demand uses unknown menu code ${r.itemCode}`, r.itemCode); continue; }
    if (it.active === false) issue("inactive-item", `${it.name} is inactive but has demand`, it.code);
    const g = it.group || "Unassigned";
    const f = (out.fg[it.code] ||= { code: it.code, name: it.name, group: g, unit: it.unit, qty: 0, value: 0, direct: 0 });
    f.qty += q; f.direct += q * directFor(db, g, r.kitchenId, r.date);
    if (q > 0) walk(it.code, q, g, r.kitchenId, r.date, it.code, [it.code]);
  }
}
const byName = (a, b) => a.name.localeCompare(b.name);
function finalize(out) {
  const fg = Object.values(out.fg).map(f => ({ ...f, matPerMeal: f.qty ? f.value / f.qty : 0, directPerMeal: f.qty ? f.direct / f.qty : 0, costPerMeal: f.qty ? (f.value + f.direct) / f.qty : 0, total: f.value + f.direct }))
    .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name));
  return { fg, sfg: Object.values(out.sfg).map(s => ({ ...s, usedBy: [...s.usedBy] })).sort(byName), mat: Object.values(out.mat).sort(byName) };
}
export function selectKitchens(db, { zone, kitchenId }) { return db.kitchens.filter(k => k.active !== false && (!kitchenId || k.id === kitchenId) && (!zone || k.zone === zone)); }
export function plan(db, { from, to, zone, kitchenId }) {
  const ks = selectKitchens(db, { zone, kitchenId }), ids = ks.map(k => k.id);
  const rows = db.demand.filter(d => d.date >= from && d.date <= to && ids.includes(d.kitchenId) && N(d.qty) > 0);
  const issues = new Map(); const issue = (type, message, key) => issues.set(type + key, { type, message });
  const run = rs => { const out = { fg: {}, sfg: {}, mat: {} }; explode(db, rs, out, issue); return finalize(out); };
  const total = run(rows);
  const perKitchen = ks.map(k => ({ kitchen: k, ...run(rows.filter(r => r.kitchenId === k.id)) })).filter(x => x.fg.length);
  const meals = rows.reduce((s, r) => s + N(r.qty), 0), value = total.fg.reduce((s, f) => s + f.value, 0), direct = total.fg.reduce((s, f) => s + f.direct, 0);
  const groups = [...new Set([...GROUPS, ...total.fg.map(f => f.group)])].map(g => { const fs = total.fg.filter(f => f.group === g), m = fs.reduce((s, f) => s + f.qty, 0), v = fs.reduce((s, f) => s + f.value, 0), dx = fs.reduce((s, f) => s + f.direct, 0); return { group: g, meals: m, material: v, direct: dx, total: v + dx, perMeal: m ? (v + dx) / m : 0, matPerMeal: m ? v / m : 0 }; });
  return { kitchens: ks, ids, rows, meals, value, direct, groups, perKitchen, ...total, issues: [...issues.values()] };
}
export function actuals(db, { from, to, ids }) {
  const byKey = {}, byCode = {}, issues = [];
  for (const s of db.stock) {
    if (!s.date || s.date < from || s.date > to || !ids.includes(s.kitchenId)) continue;
    if ([s.opening, s.closing].some(v => v === "" || v == null)) continue;
    const qty = N(s.opening) + N(s.purchases) - N(s.closing), rate = rateFor(db, s.materialCode, s.kitchenId, s.date);
    if (rate == null && qty) issues.push({ type: "missing-rate", message: `No rate for ${db.materials.find(m => m.code === s.materialCode)?.name || s.materialCode} on ${s.date} — actual value not calculated` });
    if (qty < 0) issues.push({ type: "negative-actual", message: `${db.materials.find(m => m.code === s.materialCode)?.name || s.materialCode} on ${s.date}: closing is higher than opening + purchases` });
    for (const [map, key] of [[byKey, s.kitchenId + "|" + s.materialCode], [byCode, s.materialCode]]) { const o = (map[key] ||= { qty: 0, value: 0, valued: true }); o.qty += qty; if (rate == null) o.valued = false; else o.value += qty * rate; }
  }
  return { byKey, byCode, issues, any: Object.keys(byCode).length > 0 };
}
export function compare(db, { from, to, zone, kitchenId }) {
  const p = plan(db, { from, to, zone, kitchenId }), a = actuals(db, { from, to, ids: p.ids }); const mats = Object.fromEntries(db.materials.map(m => [m.code, m])), ideal = Object.fromEntries(p.mat.map(m => [m.code, m]));
  const codes = [...new Set([...Object.keys(ideal), ...Object.keys(a.byCode)])];
  const rows = codes.map(c => { const m = mats[c] || { name: c, unit: "" }, i = ideal[c], x = a.byCode[c]; const iq = i ? i.qty : 0, iv = i ? i.value : 0, aq = x ? x.qty : null, av = x && x.valued ? x.value : null;
    return { code: c, name: m.name, unit: m.unit, byGroup: i ? i.byGroup : {}, recipeUnits: i?.recipeUnits, idealQty: iq, idealValue: iv, actualQty: aq, actualValue: av, varQty: aq != null ? aq - iq : null, varValue: av != null ? av - iv : null }; }).sort(byName);
  const actualValue = rows.reduce((s, r) => s + (r.actualValue || 0), 0);
  const issues = [...p.issues, ...a.issues]; const seen = new Set(); 
  return { p, rows, actualValue, hasActual: a.any, act: a, issues: issues.filter(i => { const k = i.type + i.message; if (seen.has(k)) return false; seen.add(k); return true; }) };
}
export const fmt = (n, d = 2) => n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
export const inr = (n, d = 2) => n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const zonesOf = db => [...new Set(db.kitchens.map(k => k.zone).filter(Boolean))].sort();
