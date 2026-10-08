"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { useEffect, useState } from "react";
const MAIN = [["/", "Overview", "▦"], ["/plan", "Production plan", "▤"], ["/demand", "Meal demand", "＋"], ["/consumption", "Consumption", "◷"], ["/sfg-conversion", "SFG FG Conversion", "⚖"]];
const CONF = [["/masters", "Recipes & masters", "◇"], ["/how", "How it works", "ⓘ"]];
export function Shell({ eyebrow, title, sub, children }) {
  const p = usePathname(); const [d, setD] = useState("");
  useEffect(() => setD(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()), []);
  const Item = ([h, l, i]) => <Link key={h} href={h} className={"nav" + (p === h ? " on" : "")}><span className="ic">{i}</span>{l}</Link>;
  return (<div className="app">
    <header className="top"><div className="brand"><span className="logo">NY</span><div><b>NIYAM</b><small>RK GROUP FOOD OPERATIONS</small></div></div>
      <div className="crumb">Production control <i>/</i> India operations</div><div className="right"><span className="pilltop">Planning workspace</span><span className="date">{d}</span></div></header>
    <div className="body"><aside className="side"><div className="sec">WORKSPACE</div><nav>{MAIN.map(Item)}</nav><div className="sec">CONFIGURATION</div><nav>{CONF.map(Item)}</nav>
      <div className="sidefoot"><span className="logo sm">IN</span><div><b>Pan-India kitchens</b><small>BOM-led production</small></div></div></aside>
      <main><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}{children}<footer>RK GROUP • PRODUCTION CONTROL &nbsp; Recipe-led planning for distributed kitchens</footer></main></div></div>);
}
export const Section = ({ eyebrow, title, note, children }) => <section className="secn"><div className="sh"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{note && <p className="note">{note}</p>}</div>{children}</section>;
export const Empty = ({ title, children }) => <div className="empty"><b>{title}</b><p>{children}</p></div>;
export const Kpi = ({ label, value, tone, sub }) => <div className={"kpi " + (tone || "")}><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;
const LABEL = { "missing-recipe": "Missing recipe", "missing-rate": "Missing material rates", "invalid-basis": "Invalid recipe basis", "unit-mismatch": "Unit mismatch", "negative-actual": "Check stock", loop: "Recipe loop", "missing-item": "Unknown item", "missing-material": "Unknown material", "inactive-item": "Inactive item" };
export function Issues({ issues }) {
  if (!issues?.length) return null; const g = {}; issues.forEach(i => (g[i.type] ||= []).push(i.message));
  return <div className="issues"><b>Needs attention ({issues.length})</b>{Object.entries(g).map(([t, m]) => <details key={t}><summary><span className="tag">{LABEL[t] || t}</span> {m.length} item{m.length > 1 ? "s" : ""}</summary><ul>{m.slice(0, 60).map((x, i) => <li key={i}>{x}</li>)}{m.length > 60 && <li>…and {m.length - 60} more</li>}</ul></details>)}</div>;
}
export const Loading = () => <div className="empty">Loading…</div>;
export const Table = ({ head, children, empty }) => <div className="tw"><table><thead><tr>{head.map((h, i) => <th key={i} className={h.startsWith("#") ? "r" : ""}>{h.replace(/^#/, "")}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty}</div>;
export function Filters({ f, setF, onApply, zones, kitchens, label }) {
  return <div className="filters"><label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
    <label>Zone<select value={f.zone} onChange={e => setF({ ...f, zone: e.target.value, kitchen: "" })}><option value="">All</option>{zones.map(z => <option key={z}>{z}</option>)}</select></label>
    <label>Kitchen<select value={f.kitchen} onChange={e => setF({ ...f, kitchen: e.target.value })}><option value="">All</option>{kitchens.filter(k => !f.zone || k.zone === f.zone).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
    <button className="ghost" onClick={onApply}>↻ {label || "Update view"}</button></div>;
}
