"use client";
import { useState, useEffect } from "react";
import { Shell, Section, Loading, Empty, Table } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { fmt, today, GROUPS } from "@/lib/engine";
export default function Demand() {
  const { db, act, setDb, err, setErr } = useDb(); const [kid, setKid] = useState(""); const [date, setDate] = useState(today()); const [q, setQ] = useState({}); const [msg, setMsg] = useState(""); const [csv, setCsv] = useState(""); const [imp, setImp] = useState(null); const [hwDate, setHwDate] = useState("");
  const kitchens = db ? db.kitchens.filter(k => k.active !== false) : []; const kitchen = kid || kitchens[0]?.id || "";
  const load = () => { if (!db) return; const v = {}; db.demand.filter(d => d.kitchenId === kitchen && d.date === date).forEach(d => v[d.itemCode] = d.qty); setQ(v); setMsg(""); };
  useEffect(load, [db, kitchen, date]);
  useEffect(() => { fetch("/api/howrah").then(r => r.json()).then(setImp); }, []);
  if (!db) return <Shell eyebrow="DEMAND ENTRY" title="Meal demand"><Loading /></Shell>;
  const fgs = db.items.filter(i => i.type === "FG" && i.active !== false); const groups = [...new Set([...GROUPS, ...fgs.map(i => i.group)])].filter(g => fgs.some(i => i.group === g));
  const save = async () => { if (await act({ op: "saveDemand", kitchenId: kitchen, date, rows: fgs.map(i => ({ itemCode: i.code, qty: q[i.code] || 0 })) })) setMsg(`Demand saved for ${date}.`); };
  const total = fgs.reduce((s, i) => s + (+q[i.code] || 0), 0);
  const importCsv = async () => { const ok = [], bad = []; const byKD = {};
    csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((l, i) => { const [d, k, c, n] = l.split(/[,\t]/).map(s => s.trim()); if (/^date$/i.test(d)) return;
      const kt = db.kitchens.find(x => x.code === (k || "").toUpperCase() || x.name.toLowerCase() === (k || "").toLowerCase()), it = db.items.find(x => x.code === (c || "").toUpperCase() && x.type === "FG");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) bad.push(`Line ${i + 1}: date must be YYYY-MM-DD`); else if (!kt) bad.push(`Line ${i + 1}: unknown kitchen "${k}"`); else if (!it) bad.push(`Line ${i + 1}: unknown menu code "${c}"`); else if (!(+n >= 0)) bad.push(`Line ${i + 1}: quantity must be a number`); else { (byKD[kt.id + "|" + d] ||= { kitchenId: kt.id, date: d, map: {} }).map[it.code] = +n; ok.push(1); } });
    for (const g of Object.values(byKD)) { const existing = {}; db.demand.filter(x => x.kitchenId === g.kitchenId && x.date === g.date).forEach(x => existing[x.itemCode] = x.qty); await act({ op: "saveDemand", kitchenId: g.kitchenId, date: g.date, rows: Object.entries({ ...existing, ...g.map }).map(([itemCode, qty]) => ({ itemCode, qty })) }); }
    setMsg(`${ok.length} row(s) imported.` + (bad.length ? ` Skipped: ${bad.join("; ")}` : "")); if (ok.length) setCsv(""); };
  const loadPart = async (part, d0) => { const r = await fetch("/api/howrah", { method: "POST", body: JSON.stringify({ part, date: d0 }) }); const j = await r.json(); if (!r.ok) return setErr(j.error); setErr(""); setDb(j.db); setMsg(Object.entries(j.added).map(([k, v]) => typeof v === "string" ? v : `${v} ${k}`).join(", ") + " added (existing data untouched)."); };
  return <Shell eyebrow="DEMAND ENTRY" title="Meal demand" sub="Enter the planned meal quantities for each menu item and kitchen.">
    {err && <div className="err">{err}</div>}
    <div className="filters"><label>Kitchen<select value={kitchen} onChange={e => setKid(e.target.value)}>{kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
      <label>Service date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><button className="ghost" onClick={load}>Load quantities</button><button onClick={save} disabled={!kitchen || !fgs.length}>✓ Save demand</button></div>
    {!kitchens.length ? <div className="info">Add a kitchen first: <a href="/masters">Recipes & masters → Kitchens</a>, or load the demo/Howrah data below.</div> : <div className="info">Ready to enter demand. {fgs.length} active menu items available. Select a kitchen and date, enter quantities, then click Save demand.{msg && <b> {msg}</b>}</div>}
    <Section eyebrow="MEAL DEMAND" title="Planned meals by menu" note={`Enter the meal count for each active FG/menu item · Total ${fmt(total, 0)} meals`}>
      {!fgs.length ? <Empty title="No menu items yet">Add FG / menu items under Recipes & masters, or load the demo data below.</Empty> : groups.map(g => <div key={g} style={{ marginBottom: 16 }}><div className="eyebrow" style={{ margin: "8px 0" }}>{g}</div>
        <Table head={["FG / menu","FG code","#Meal qty"]}>{fgs.filter(i => i.group === g).map(i => <tr key={i.code}><td>{i.name}</td><td>{i.code}</td><td className="r"><input type="number" min="0" value={q[i.code] ?? ""} placeholder="0" onChange={e => setQ({ ...q, [i.code]: e.target.value })} /></td></tr>)}</Table></div>)}</Section>
    <details className="imp"><summary>Import data (CSV, Howrah workbook, demo)</summary>
      <div className="panel"><b>Paste CSV</b><p className="sub">One row per line: <code>date, kitchen code or name, menu code, meals</code> e.g. <code>2026-10-01, HWH, FG011, 350</code>. Bad rows are skipped and listed.</p><textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="2026-10-01, HWH, FG011, 350" /><p><button onClick={importCsv} disabled={!csv.trim()}>Validate & import</button></p></div>
      <div className="panel"><b>Howrah workbook data</b><p className="sub">The workbook has <b>one total per menu item (August)</b> and no service dates. Choose the date these totals are filed under, and the effective date for rates and recipes. Loading only adds missing rows.</p>
        <div className="filters" style={{ border: 0, padding: 0, margin: 0, boxShadow: "none" }}><label>Date<input type="date" value={hwDate} onChange={e => setHwDate(e.target.value)} /></label><button className="ghost" disabled={!hwDate} onClick={() => loadPart("masters", hwDate)}>1 · Load setup, rates & recipes</button><button disabled={!hwDate || !db.items.length} onClick={() => loadPart("demand", hwDate)}>2 · Load meal demand{imp ? ` (${imp.counts.demand} rows)` : ""}</button></div>
        <p className="sub" style={{ marginBottom: 0 }}>Review notes: Recipes & masters → Import review.</p></div>
      <div className="panel"><b>Demo data</b><p className="sub">Adds 3 sample menu items with a prep gravy, sample rates, sample demand and stock on the date chosen above. Labelled DEMO.</p><button onClick={() => loadPart("demo", date)}>Load 3 demo items for {date}</button></div></details>
  </Shell>;
}
