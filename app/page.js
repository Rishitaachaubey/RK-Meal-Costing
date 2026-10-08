"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell, Section, Kpi, Issues, Loading, Empty, Table, Filters } from "@/components/ui";
import { useDb } from "@/lib/useDb";
import { compare, fmt, inr, today, zonesOf, GROUPS } from "@/lib/engine";

export default function Overview() {
  const { db } = useDb();
  const [f, setF] = useState({ date: today(), zone: "", kitchen: "" });
  const [a, setA] = useState(f);

  if (!db) return <Shell eyebrow="OPERATIONS OVERVIEW" title="NIYAM Production Control"><Loading /></Shell>;

  const c = compare(db, { from: a.date, to: a.date, zone: a.zone, kitchenId: a.kitchen });
  const p = c.p;

  const idealPer = p.meals ? (p.value + p.direct) / p.meals : 0;
  const actPer = p.meals && c.hasActual ? (c.actualValue + p.direct) / p.meals : null;
  const varc = c.hasActual ? c.actualValue - p.value : null;

  // L&D group metrics
  const ldGroup = p.groups.find(g => g.group === "Lunch & Dinner") || { meals: 0, total: 0, perMeal: 0 };
  const ldCostPerMeal = ldGroup.perMeal || 1;

  // Non-L&D Services Total Value
  const nonLdServices = p.groups.filter(g => g.group !== "Lunch & Dinner");
  const nonLdTotalValue = nonLdServices.reduce((sum, g) => sum + g.total, 0);

  // Total Equivalent FG Meals = (Non-L&D Value / L&D Cost per Meal) + L&D Meals
  const totalFgMeals = (nonLdTotalValue / ldCostPerMeal) + ldGroup.meals;

  const groups = [...new Set([...GROUPS, ...p.fg.map(x => x.group)])];

  return (
    <Shell
      eyebrow="OPERATIONS OVERVIEW"
      title="NIYAM Production Control"
      sub="See daily Planned SFGs, Finished Goods meal conversion, and kitchen performance in one place."
    >
      <Filters f={f} setF={setF} onApply={() => setA(f)} zones={zonesOf(db)} kitchens={db.kitchens} />

      {!db.kitchens.length && (
        <div className="info">
          Start in <Link href="/masters">Recipes & masters</Link>: add a kitchen, materials, menu items and recipes. Or load Howrah demo data from <Link href="/demand">Meal demand</Link>.
        </div>
      )}

      <div className="kpis">
        <Kpi label="Planned SFGs" value={fmt(p.meals, 0)} sub="Total portion demand" />
        <Kpi label="Total FG Meals" value={fmt(totalFgMeals, 2)} sub="Equivalent meal output" />
        <Kpi label="Ideal cost / meal" value={inr(idealPer)} />
        <Kpi label="Actual cost / meal" value={inr(actPer)} sub={c.hasActual ? "From stock entry" : "No stock entered"} />
        <Kpi label="Ideal material cost" value={inr(p.value)} />
        <Kpi label="Cost variance" value={varc == null ? "—" : (varc >= 0 ? "+ " : "− ") + inr(Math.abs(varc))} tone={varc > 0 ? "red" : ""} />
      </div>

      <Issues issues={c.issues} />

      <Section eyebrow="MENU ECONOMICS" title="Cost by service" note="Per-meal cost and planned portions by service group.">
        <div className="cards">
          {groups.map(g => {
            const x = p.groups.find(y => y.group === g);
            return (
              <Kpi
                key={g}
                tone="sm"
                label={g}
                value={inr(x?.perMeal || 0)}
                sub={`${fmt(x?.meals || 0, 0)} ${g === 'Lunch & Dinner' ? 'Eq meals' : 'meals'}`}
              />
            );
          })}
        </div>
      </Section>

      <Section eyebrow="FINISHED MENU COST" title="Finished menu cost breakdown" note="Per-meal cost and total cost by menu item">
        <Table
          head={["Meal group", "FG / menu", "#SFG Qty", "#BOM material / meal", "#Direct exp. / meal", "#FG cost / meal", "#Total cost"]}
          empty={!p.fg.length && <Empty title="No meal demand for this selection">Enter quantities on the Meal demand page.</Empty>}
        >
          {p.fg.map(x => (
            <tr key={x.code}>
              <td>{x.group}</td>
              <td>{x.name}{x.gaps ? <span className="pos"> · incomplete</span> : ""}</td>
              <td className="r">{fmt(x.qty, 0)}</td>
              <td className="r">{inr(x.matPerMeal)}</td>
              <td className="r">{inr(x.directPerMeal)}</td>
              <td className="r">{inr(x.costPerMeal)}</td>
              <td className="r">{inr(x.total)}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </Shell>
  );
}
