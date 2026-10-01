"use client";
import { useState, useEffect } from "react";
import { Shell, Section, Loading, Empty, Table } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { fmt, today, GROUPS, zonesOf } from "@/lib/engine";
const AS = [["1", "Active"], ["0", "Inactive"]];
const opt = (list, v, l) => list.map(x => [x[v], typeof l === "function" ? l(x) : x[l]]);
const same = (a, b) => (a || "").toUpperCase() === (b || "").toUpperCase();
function tabs(db) {
  const items = t => db.items.filter(i => i.type === t), unitOpts = db.units.map(u => [u.code, u.code]), kOpt = [["", "All kitchens"], ...opt(db.kitchens, "id", "name")];
  const compUnit = (f, type) => (type === "SFG" ? db.items.find(i => i.code === f.comp) : db.materials.find(m => m.code === f.comp))?.unit || "";
  const recipe = (name, pType, cType, hint) => ({ name, table: "recipes", hint, filter: r => r.componentType === cType && db.items.find(i => i.code === r.parentCode)?.type === pType,
    fields: [{ k: "parent", l: pType === "FG" ? "FG / menu" : "SFG", type: "select", opts: opt(items(pType), "code", i => `${i.code} · ${i.name}`), req: 1 },
      { k: "comp", l: cType === "SFG" ? "SFG component" : "Material", type: "select", opts: cType === "SFG" ? opt(items("SFG"), "code", i => `${i.code} · ${i.name}`) : opt(db.materials, "code", m => `${m.code} · ${m.name}`), req: 1 },
      { k: "basis", l: pType === "FG" ? "Recipe portions (basis)" : "Basis qty (SFG units)", type: "number", req: 1, ph: "e.g. 100" }, { k: "qty", l: "Component quantity", type: "number", req: 1 }, { k: "unit", l: "Unit", type: "select", opts: unitOpts, req: 1 },
      { k: "from", l: "Effective from", type: "date", def: today() }, { k: "to", l: "Effective to (optional)", type: "date" }, { k: "kitchen", l: "Kitchen (optional)", type: "select", opts: kOpt }],
    onChange: (f, k, v) => k === "comp" ? { ...f, comp: v, unit: compUnit({ comp: v }, cType) || f.unit } : f,
    toForm: r => ({ parent: r.parentCode, comp: r.componentCode, basis: r.basisQty, qty: r.qty, unit: r.unit, from: r.effectiveFrom, to: r.effectiveTo || "", kitchen: r.kitchenId || "" }),
    prep: (f, ed) => { if (!(+f.basis > 0)) return "Portion basis must be above 0."; if (!(+f.qty > 0)) return "Quantity must be above 0."; const cu = compUnit(f, cType); if (cu && !same(cu, f.unit)) return `Unit must be ${cu} (the base unit of this component). The app does not convert units.`; return { ...(ed ? { id: ed.id } : {}), parentCode: f.parent, componentType: cType, componentCode: f.comp, basisQty: +f.basis, qty: +f.qty, unit: f.unit, effectiveFrom: f.from || today(), effectiveTo: f.to || "", kitchenId: f.kitchen || "" }; },
    cols: [["Parent", r => db.items.find(i => i.code === r.parentCode)?.name || r.parentCode], ["Component", r => (cType === "SFG" ? db.items : db.materials).find(x => x.code === r.componentCode)?.name || r.componentCode], ["#Basis", r => +r.basisQty > 0 ? fmt(r.basisQty, 0) : <span className="pos">Invalid</span>], ["#Qty", r => fmt(r.qty, 4)], ["Unit", r => r.unit], ["Effective", r => r.effectiveFrom + (r.effectiveTo ? " → " + r.effectiveTo : " →")], ["Kitchen", r => db.kitchens.find(k => k.id === r.kitchenId)?.name || "All"]], key: "id" });
  const itemTab = (name, type, hint) => ({ name, table: "items", hint, filter: i => i.type === type, key: "code",
    fields: [{ k: "code", l: "Code", ph: type === "FG" ? "e.g. FG001" : "e.g. SFG001", req: 1 }, { k: "name", l: "Name", ph: type === "FG" ? "e.g. Veg Meal" : "e.g. Onion Gravy", req: 1 }, ...(type === "FG" ? [{ k: "group", l: "Service group", type: "select", opts: GROUPS.map(g => [g, g]), req: 1 }] : []), { k: "unit", l: type === "FG" ? "Unit" : "Output UOM", type: "select", opts: unitOpts, req: 1, def: type === "FG" ? "portion" : "KG" }, { k: "active", l: "Active", type: "select", opts: AS, def: "1" }],
    toForm: i => ({ code: i.code, name: i.name, group: i.group, unit: i.unit, active: i.active === false ? "0" : "1" }), lockKey: "code",
    prep: f => ({ code: f.code, name: f.name.trim(), type, group: type === "FG" ? f.group : "Prep", unit: f.unit, active: f.active !== "0" }),
    cols: [["Code", i => i.code], ["Name", i => i.name], ...(type === "FG" ? [["Service group", i => i.group]] : []), ["Unit", i => i.unit], ["Active", i => i.active === false ? "No" : "Yes"]] });
  return [
    { name: "Kitchens", table: "kitchens", key: "id", hint: "Step 1: add the kitchen that will enter demand. Use a short unique code, such as HWH, and the kitchen name.", filter: () => true, lockKey: "code",
      fields: [{ k: "code", l: "Code", ph: "e.g. HWH", req: 1 }, { k: "name", l: "Name", ph: "e.g. Howrah", req: 1 }, { k: "zone", l: "Zone", ph: "e.g. East", list: zonesOf(db), req: 1 }, { k: "active", l: "Active", type: "select", opts: AS, def: "1" }],
      toForm: k => ({ code: k.code, name: k.name, zone: k.zone, active: k.active === false ? "0" : "1" }), prep: (f, ed) => ({ id: ed ? ed.id : f.code.trim().toUpperCase(), code: f.code, name: f.name.trim(), zone: f.zone.trim(), active: f.active !== "0" }),
      cols: [["Code", k => k.code], ["Name", k => k.name], ["Zone", k => k.zone], ["Active", k => k.active === false ? "No" : "Yes"]] },
    { name: "Material Items", table: "materials", key: "code", hint: "Complete the fields and save this row. Use the same codes when linking recipes.", filter: () => true, lockKey: "code",
      fields: [{ k: "code", l: "Code", ph: "e.g. 101", req: 1 }, { k: "name", l: "Name", ph: "e.g. Rice", req: 1 }, { k: "unit", l: "Base UOM", type: "select", opts: unitOpts, req: 1 }, { k: "active", l: "Active", type: "select", opts: AS, def: "1" }],
      toForm: m => ({ code: m.code, name: m.name, unit: m.unit, active: m.active === false ? "0" : "1" }), prep: f => ({ code: f.code, name: f.name.trim(), unit: f.unit, active: f.active !== "0" }),
      cols: [["Code", m => m.code], ["Name", m => m.name], ["Base UOM", m => m.unit], ["Active", m => m.active === false ? "No" : "Yes"]] },
    itemTab("FG / Menu Master", "FG", "Each finished menu item needs a unique code, name, service group, unit and active status."), itemTab("SFG Master", "SFG", "Semi-finished / prep items that are made in bulk and used in several menu items."),
    recipe("FG → SFG BOM", "FG", "SFG", "For [recipe portions] of the FG, use [quantity] of the prep item."), recipe("FG → Material Recipe", "FG", "MATERIAL", "For [recipe portions] of the menu item, use [quantity] of the material. The unit must match the material’s base UOM."), recipe("SFG → Material BOM", "SFG", "MATERIAL", "For [basis quantity] of the prep item, use [quantity] of the material."),
    { name: "Material Rates", table: "rates", key: "id", hint: "Rate per base UOM, valid from the effective date. A kitchen-specific rate overrides the all-kitchens rate.", filter: () => true,
      fields: [{ k: "mat", l: "Material", type: "select", opts: opt(db.materials, "code", m => `${m.code} · ${m.name} (${m.unit})`), req: 1 }, { k: "rate", l: "Rate ₹ per base UOM", type: "number", req: 1 }, { k: "from", l: "Effective from", type: "date", def: today() }, { k: "kitchen", l: "Kitchen (optional)", type: "select", opts: kOpt }],
      toForm: r => ({ mat: r.materialCode, rate: r.rate, from: r.effectiveFrom, kitchen: r.kitchenId || "" }), prep: (f, ed) => +f.rate > 0 ? { ...(ed ? { id: ed.id } : {}), materialCode: f.mat, rate: +f.rate, effectiveFrom: f.from || today(), kitchenId: f.kitchen || "" } : "Rate must be above 0.",
      cols: [["Material", r => db.materials.find(m => m.code === r.materialCode)?.name || r.materialCode], ["UOM", r => db.materials.find(m => m.code === r.materialCode)?.unit], ["#Rate ₹", r => fmt(r.rate)], ["Effective from", r => r.effectiveFrom], ["Kitchen", r => db.kitchens.find(k => k.id === r.kitchenId)?.name || "All"]] },
    { name: "Other Direct Expenses / Meal", table: "expenses", key: "id", hint: "Labour, gas, packing etc. added per meal to the material cost of a service group.", filter: () => true,
      fields: [{ k: "grp", l: "Service group", type: "select", opts: GROUPS.map(g => [g, g]), req: 1 }, { k: "amt", l: "₹ per meal", type: "number", req: 1 }, { k: "from", l: "Effective from", type: "date", def: today() }, { k: "kitchen", l: "Kitchen (optional)", type: "select", opts: kOpt }, { k: "note", l: "Note" }],
      toForm: r => ({ grp: r.serviceGroup, amt: r.amount, from: r.effectiveFrom, kitchen: r.kitchenId || "", note: r.note || "" }), prep: (f, ed) => +f.amt >= 0 && f.amt !== "" ? { ...(ed ? { id: ed.id } : {}), serviceGroup: f.grp, amount: +f.amt, effectiveFrom: f.from || today(), kitchenId: f.kitchen || "", note: f.note || "" } : "Enter the ₹ per meal.",
      cols: [["Service group", r => r.serviceGroup], ["#₹ / meal", r => fmt(r.amount)], ["Effective from", r => r.effectiveFrom], ["Kitchen", r => db.kitchens.find(k => k.id === r.kitchenId)?.name || "All"], ["Note", r => r.note]] },
  ];
}
function Master({ db, write, err, setErr, cfg }) {
  const init = () => Object.fromEntries(cfg.fields.map(f => [f.k, f.def ?? ""])); const [f, setF] = useState(init); const [ed, setEd] = useState(null); const [s, setS] = useState("");
  const rows = db[cfg.table].filter(cfg.filter); const shown = rows.filter(r => !s || JSON.stringify(r).toLowerCase().includes(s.toLowerCase()));
  const set = (k, v) => setF(x => cfg.onChange ? cfg.onChange({ ...x, [k]: v }, k, v) : { ...x, [k]: v });
  const reset = () => { setF(init()); setEd(null); };
  const save = async () => { const miss = cfg.fields.find(x => x.req && (f[x.k] === "" || f[x.k] == null)); if (miss) return setErr(`${miss.l} is required.`); const r = cfg.prep(f, ed); if (typeof r === "string") return setErr(r); if (await write(cfg.table, r, ed ? "upsert" : "create")) reset(); };
  return <><p className="sub">{cfg.hint}</p><div className="panel"><div className="form">{cfg.fields.map(x => <label key={x.k}>{x.l}{x.type === "select" ? <select value={f[x.k]} onChange={e => set(x.k, e.target.value)} disabled={ed && cfg.lockKey === x.k}>{!x.def && !x.opts.some(o => o[0] === "") && <option value="">Choose…</option>}{x.opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select> : <><input type={x.type || "text"} step="any" list={x.list ? "dl-" + x.k : undefined} placeholder={x.ph} value={f[x.k]} disabled={ed && cfg.lockKey === x.k} onChange={e => set(x.k, e.target.value)} />{x.list && <datalist id={"dl-" + x.k}>{x.list.map(z => <option key={z} value={z} />)}</datalist>}</>}</label>)}
    <div style={{ display: "flex", gap: 8 }}><button onClick={save}>{ed ? "Update row" : "Save row"}</button>{ed && <button className="ghost" onClick={reset}>Cancel</button>}</div></div></div>
    {err && <div className="err">{err}</div>}
    <Section eyebrow="MASTER DATA" title="Current records" note="Active configuration used by the production plan and costing"><div className="filters" style={{ margin: "0 0 10px" }}><label>Search<input value={s} onChange={e => setS(e.target.value)} placeholder="Type to filter" /></label><span className="note">{shown.length} of {rows.length} rows</span></div>
      <Table head={[...cfg.cols.map(c => c[0]), "Action"]} empty={!shown.length && <Empty title="No records yet">Use the form above to add the first row.</Empty>}>
        {shown.map(r => <tr key={r[cfg.key]}>{cfg.cols.map((c, i) => <td key={i} className={c[0].startsWith("#") ? "r" : ""}>{c[1](r)}</td>)}<td><button className="lnk" onClick={() => { setF({ ...init(), ...cfg.toForm(r) }); setEd(r); setErr(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="lnk d" onClick={() => confirm("Delete this row?") && write(cfg.table, r, "delete")}>Delete</button></td></tr>)}</Table></Section></>;
}
export default function Masters() {
  const { db, write, err, setErr } = useDb(); const [tab, setTab] = useState(0); const [rv, setRv] = useState(null);
  useEffect(() => { fetch("/api/howrah").then(r => r.json()).then(setRv); }, []);
  if (!db) return <Shell eyebrow="BACK OFFICE" title="Recipes & masters"><Loading /></Shell>;
  const T = tabs(db); const names = [...T.map(t => t.name), "Import review"];
  return <Shell eyebrow="BACK OFFICE" title="Recipes & masters" sub="Maintain kitchens, menus, recipe structure, rates, and direct expenses.">
    <div className="tabs">{names.map((n, i) => <button key={n} className={i === tab ? "on" : ""} onClick={() => { setTab(i); setErr(""); }}>{n}</button>)}</div>
    {tab < T.length ? <Master key={tab} db={db} write={write} err={err} setErr={setErr} cfg={T[tab]} /> : !rv ? <Loading /> : <><p className="sub">Things in the Howrah workbook that were <b>not guessed</b>. Check with the kitchen team, then fix them in the tabs above.</p>
      <Table head={["Type","What was found","Where"]}>{rv.review.map((r, i) => <tr key={i}><td><span className="tag" style={{ background: "var(--warn)", color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>{r.kind}</span></td><td style={{ whiteSpace: "normal", minWidth: 280 }}>{r.message}</td><td>{r.ref}</td></tr>)}</Table></>}
  </Shell>;
}
