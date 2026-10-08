"use client";
import { useState, useEffect } from "react";
import { Shell, Section, Loading, Empty, Table } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { fmt, today } from "@/lib/engine";
const prevDay = d => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
export default function Consumption() {
  const { db, act, err } = useDb(); const [kid, setKid] = useState(""); const [date, setDate] = useState(today()); const [v, setV] = useState({}); const [msg, setMsg] = useState(""); const [s, setS] = useState("");
  const kitchens = db ? db.kitchens.filter(k => k.active !== false) : []; const kitchen = kid || kitchens[0]?.id || "";
  const load = () => { if (!db) return; const out = {};
    for (const m of db.materials.filter(m => m.active !== false)) { const e = db.stock.find(x => x.kitchenId === kitchen && x.date === date && x.materialCode === m.code);
      if (e) out[m.code] = { o: e.opening, p: e.purchases, c: e.closing };
      else { const prev = db.stock.filter(x => x.kitchenId === kitchen && x.materialCode === m.code && x.date && x.date < date && x.closing !== "" && x.closing != null).sort((a, b) => b.date.localeCompare(a.date))[0]; out[m.code] = { o: prev ? prev.closing : "", p: "", c: "", def: !!prev }; } }
    setV(out); setMsg(""); };
  useEffect(load, [db, kitchen, date]);
  if (!db) return <Shell eyebrow="STOCK & USAGE" title="Consumption entry"><Loading /></Shell>;
  const set = (c, k, x) => setV(o => ({ ...o, [c]: { ...o[c], [k]: x, def: k === "o" ? false : o[c].def } }));
  const save = async () => { if (await act({ op: "saveStock", kitchenId: kitchen, date, rows: Object.entries(v).filter(([, x]) => x.p !== "" || x.c !== "" || (x.o !== "" && !x.def)).map(([materialCode, x]) => ({ materialCode, opening: x.o, purchases: x.p, closing: x.c })) })) setMsg(`Stock saved for ${date}.`); };
  const actual = x => x.o === "" || x.c === "" ? null : (+x.o || 0) + (+x.p || 0) - (+x.c || 0);
  const mats = db.materials.filter(m => m.active !== false && m.name.toLowerCase().includes(s.toLowerCase()));
  return <Shell eyebrow="STOCK & USAGE" title="Consumption entry" sub="Record opening stock, purchases, and closing stock to calculate actual usage.">
    {err && <div className="err">{err}</div>}
    <div className="filters"><label>Kitchen<select value={kitchen} onChange={e => setKid(e.target.value)}>{kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label><label>Service date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <button className="ghost" onClick={load}>Load stock</button><button onClick={save} disabled={!kitchen}>✓ Save stock</button></div>
    {msg && <div className="ok">{msg}</div>}
    <Section eyebrow="DAILY USAGE" title="Material movement" note="Opening defaults to the previous day’s closing stock where available">
      <div className="filters" style={{ margin: "0 0 12px" }}><label>Find material<input value={s} onChange={e => setS(e.target.value)} placeholder="Type to search" /></label></div>
      {!kitchens.length ? <Empty title="No kitchen yet">Add a kitchen under Recipes & masters.</Empty> :
      <Table head={["Material","UOM","#Opening","#Purchase","#Closing","#Actual cons"]} empty={!mats.length && <Empty title="No materials">Add materials under Recipes & masters.</Empty>}>
        {mats.map(m => { const x = v[m.code] || { o: "", p: "", c: "" }, a = actual(x); return <tr key={m.code}><td>{m.name}</td><td>{m.unit}</td>{["o","p","c"].map(k => <td key={k} className="r"><input type="number" step="any" value={x[k] ?? ""} placeholder="0" onChange={e => set(m.code, k, e.target.value)} /></td>)}<td className={"r " + (a < 0 ? "pos" : "")}>{a == null ? "—" : fmt(a)}</td></tr>; })}</Table>}</Section>
  </Shell>;
}
