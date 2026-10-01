"use client";
import { Shell, Section } from "@/components/ui";
export default function How() {
  const S = [["01 · DEMAND", "Meal plan", "Meals by menu and kitchen"], ["02 · RECIPE", "Menu BOM", "Portion basis and ingredients"], ["03 · PREP", "Shared SFGs", "Prep quantities to produce"], ["04 · CONTROL", "Actual usage", "Compare ideal with actual"]];
  return <Shell eyebrow="QUICK GUIDE" title="How production planning works" sub="A simple path from kitchen demand to ingredient control.">
    <div className="steps">{S.map(([a, b, c]) => <div className="step" key={a}><small>{a}</small><b>{b}</b><small>{c}</small></div>)}</div>
    <Section eyebrow="RULES" title="How numbers are calculated"><div className="panel"><ul style={{ lineHeight: 1.9, margin: 0 }}>
      <li><b>Production plan:</b> saved meal quantities are exploded through effective menu-to-material recipes and, where used, FG → SFG and SFG → material BOMs.</li>
      <li><b>Recipe requirement:</b> menu demand ÷ recipe portion basis × ingredient quantity. <b>Shared SFG requirement:</b> menu demand ÷ FG basis × SFG quantity, then the SFG recipe is applied to that SFG quantity using its own basis.</li>
      <li><b>Actual material:</b> opening stock + purchases − closing stock.</li>
      <li><b>Cost per meal:</b> rolled-up recipe cost plus the configured direct expenses for the service group.</li>
      <li><b>Units:</b> a recipe line must use the material’s base unit. The app never converts units on its own; mismatches are flagged and left out of value.</li></ul></div>
      <div className="info">Missing recipe links, missing rates and invalid portion bases appear as alerts in the plan. Confirm each recipe’s portion basis, ingredient quantity, and unit before using the plan for purchasing or production.</div></Section></Shell>;
}
