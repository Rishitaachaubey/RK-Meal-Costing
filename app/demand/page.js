"use client";
import { useState, useEffect } from "react";
import { Shell, Section, Loading, Empty, Table } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { fmt, today, GROUPS } from "@/lib/engine";

export default function Demand() {
  const { db, act, setDb, err, setErr } = useDb();
  const [kid, setKid] = useState("");
  const [date, setDate] = useState(today());
  const [q, setQ] = useState({});
  const [msg, setMsg] = useState("");
  const [csv, setCsv] = useState("");
  const [imp, setImp] = useState(null);
  const [hwDate, setHwDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, FG, SFG
  const [search, setSearch] = useState("");

  const kitchens = db ? db.kitchens.filter(k => k.active !== false) : [];
  const kitchen = kid || kitchens[0]?.id || "";

  const load = () => {
    if (!db) return;
    const v = {};
    db.demand.filter(d => d.kitchenId === kitchen && d.date === date).forEach(d => v[d.itemCode] = d.qty);
    setQ(v);
    setMsg("");
  };

  useEffect(load, [db, kitchen, date]);
  useEffect(() => { fetch("/api/howrah").then(r => r.json()).then(setImp); }, []);

  if (!db) return <Shell eyebrow="DEMAND ENTRY" title="Meal demand"><Loading /></Shell>;

  const allItems = db.items.filter(i => i.active !== false);
  const fgItems = allItems.filter(i => i.type === "FG");
  const sfgItems = allItems.filter(i => i.type === "SFG");

  const filteredItems = allItems.filter(i => {
    const matchType = typeFilter === "ALL" || i.type === typeFilter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const groups = [...new Set([...GROUPS, ...allItems.map(i => i.group || "Unassigned")])].filter(g => filteredItems.some(i => (i.group || "Unassigned") === g));

  const save = async () => {
    if (await act({ op: "saveDemand", kitchenId: kitchen, date, rows: allItems.map(i => ({ itemCode: i.code, qty: q[i.code] || 0 })) })) {
      setMsg(`Demand saved for ${date}.`);
    }
  };

  const totalQty = allItems.reduce((s, i) => s + (+q[i.code] || 0), 0);
  const activeCount = allItems.filter(i => +q[i.code] > 0).length;

  const importCsv = async () => {
    const ok = [], bad = []; const byKD = {};
    csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((l, i) => {
      const [d, k, c, n] = l.split(/[,\t]/).map(s => s.trim());
      if (/^date$/i.test(d)) return;
      const kt = db.kitchens.find(x => x.code === (k || "").toUpperCase() || x.name.toLowerCase() === (k || "").toLowerCase());
      const it = db.items.find(x => x.code === (c || "").toUpperCase() && x.active !== false);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) bad.push(`Line ${i + 1}: date must be YYYY-MM-DD`);
      else if (!kt) bad.push(`Line ${i + 1}: unknown kitchen "${k}"`);
      else if (!it) bad.push(`Line ${i + 1}: unknown item code "${c}"`);
      else if (!(+n >= 0)) bad.push(`Line ${i + 1}: quantity must be a number`);
      else {
        (byKD[kt.id + "|" + d] ||= { kitchenId: kt.id, date: d, map: {} }).map[it.code] = +n;
        ok.push(1);
      }
    });
    for (const g of Object.values(byKD)) {
      const existing = {};
      db.demand.filter(x => x.kitchenId === g.kitchenId && x.date === g.date).forEach(x => existing[x.itemCode] = x.qty);
      await act({ op: "saveDemand", kitchenId: g.kitchenId, date: g.date, rows: Object.entries({ ...existing, ...g.map }).map(([itemCode, qty]) => ({ itemCode, qty })) });
    }
    setMsg(`${ok.length} row(s) imported.` + (bad.length ? ` Skipped: ${bad.join("; ")}` : ""));
    if (ok.length) setCsv("");
  };

  const loadPart = async (part, d0) => {
    const r = await fetch("/api/howrah", { method: "POST", body: JSON.stringify({ part, date: d0 }) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    setErr("");
    setDb(j.db);
    setMsg(Object.entries(j.added).map(([k, v]) => typeof v === "string" ? v : `${v} ${k}`).join(", ") + " added (existing data untouched).");
  };

  return <Shell eyebrow="DEMAND ENTRY" title="Meal demand" sub="Enter planned meal quantities for FG Menu items & SFG Prep items.">
    {err && <div className="err">{err}</div>}
    
    <div className="filters">
      <label>Kitchen<select value={kitchen} onChange={e => setKid(e.target.value)}>{kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
      <label>Service date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <button className="ghost" onClick={load}>Load quantities</button>
      <button onClick={save} disabled={!kitchen || !allItems.length}>✓ Save demand</button>
    </div>

    {!kitchens.length ? (
      <div className="info">Add a kitchen first: <a href="/masters">Recipes & masters → Kitchens</a>, or load the demo/Howrah data below.</div>
    ) : (
      <div className="info">
        Ready to enter demand. <b>{allItems.length} active items</b> available ({fgItems.length} FG, {sfgItems.length} SFG). Select a kitchen and date, enter quantities, then click Save demand.
        {msg && <b style={{ color: "var(--brand)" }}> {msg}</b>}
      </div>
    )}

    <Section eyebrow="MEAL DEMAND" title="Planned meals by item (FG + SFG)" note={`Enter meal counts for active FG & SFG items · Total ${fmt(totalQty, 0)} meals across ${activeCount} items`}>
      <div className="filters" style={{ margin: "0 0 16px", background: "none", padding: 0, boxShadow: "none" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className={typeFilter === "ALL" ? "on" : "ghost"} onClick={() => setTypeFilter("ALL")}>All items ({allItems.length})</button>
          <button className={typeFilter === "FG" ? "on" : "ghost"} onClick={() => setTypeFilter("FG")}>FG / Menu Master ({fgItems.length})</button>
          <button className={typeFilter === "SFG" ? "on" : "ghost"} onClick={() => setTypeFilter("SFG")}>SFG Master ({sfgItems.length})</button>
        </div>
        <label style={{ marginLeft: "auto" }}>Search<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by code or name..." /></label>
      </div>

      {!filteredItems.length ? (
        <Empty title="No items found">No items match your filter criteria.</Empty>
      ) : (
        groups.map(g => {
          const groupItems = filteredItems.filter(i => (i.group || "Unassigned") === g);
          if (!groupItems.length) return null;
          return (
            <div key={g} style={{ marginBottom: 20 }}>
              <div className="eyebrow" style={{ margin: "12px 0 6px", fontSize: 13, color: "var(--brand)" }}>{g} ({groupItems.length} items)</div>
              <Table head={["Type", "Code", "Item Name", "UOM", "#Meal Qty"]}>
                {groupItems.map(i => (
                  <tr key={i.code}>
                    <td style={{ width: 70 }}>
                      <span className="tag" style={{
                        background: i.type === "FG" ? "var(--brand)" : "#4a5568",
                        color: "#fff",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 10,
                        fontWeight: 600
                      }}>{i.type}</span>
                    </td>
                    <td style={{ fontWeight: 600, width: 100 }}>{i.code}</td>
                    <td>{i.name}</td>
                    <td style={{ width: 80 }}>{i.unit}</td>
                    <td className="r" style={{ width: 140 }}>
                      <input
                        type="number"
                        min="0"
                        value={q[i.code] ?? ""}
                        placeholder="0"
                        onChange={e => setQ({ ...q, [i.code]: e.target.value })}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          );
        })
      )}
    </Section>

    <details className="imp">
      <summary>Import data (CSV, Howrah workbook, demo)</summary>
      <div className="panel">
        <b>Paste CSV</b>
        <p className="sub">One row per line: <code>date, kitchen code or name, item code (FG or SFG), meals</code> e.g. <code>2026-10-01, HWH, SFG0002, 350</code>.</p>
        <textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="2026-10-01, HWH, SFG0002, 350" />
        <p><button onClick={importCsv} disabled={!csv.trim()}>Validate & import</button></p>
      </div>

      <div className="panel">
        <b>Howrah workbook data</b>
        <p className="sub">The workbook has <b>one total per menu item (August)</b> and no service dates. Choose the date these totals are filed under, and the effective date for rates and recipes. Loading only adds missing rows.</p>
        <div className="filters" style={{ border: 0, padding: 0, margin: 0, boxShadow: "none" }}>
          <label>Date<input type="date" value={hwDate} onChange={e => setHwDate(e.target.value)} /></label>
          <button className="ghost" disabled={!hwDate} onClick={() => loadPart("masters", hwDate)}>1 · Load setup, rates & recipes</button>
          <button disabled={!hwDate || !db.items.length} onClick={() => loadPart("demand", hwDate)}>2 · Load meal demand{imp ? ` (${imp.counts.demand} rows)` : ""}</button>
        </div>
        <p className="sub" style={{ marginBottom: 0 }}>Review notes: Recipes & masters → Import review.</p>
      </div>

      <div className="panel">
        <b>Demo data</b>
        <p className="sub">Adds sample menu items with a prep gravy, sample rates, sample demand and stock on the date chosen above. Labelled DEMO.</p>
        <button onClick={() => loadPart("demo", date)}>Load 3 demo items for {date}</button>
      </div>
    </details>
  </Shell>;
}
