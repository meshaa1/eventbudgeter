import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, IncomeSource } from "@/lib/budget-api";
import { Btn, C, EmptyState, Input, Modal } from "./ui";

type Kind = "category" | "source";
type Item = Category | IncomeSource;
type Result = PromiseLike<{ error: { message: string } | null }>;

interface Props {
  kind: Kind;
  items: Item[];
  tid: string;
  run: (op: Result) => Promise<boolean>;
  onClose: () => void;
  onAdded?: (id: string) => void;
  zIndex?: number;
}

const colorInput = {
  width: 42, height: 40, padding: 2, flexShrink: 0,
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer",
} as const;

export function ListManager({ kind, items, tid, run, onClose, onAdded, zIndex }: Props) {
  const isCat = kind === "category";
  const [icon, setIcon] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(C.green);
  const [picking, setPicking] = useState(false);

  async function add() {
    if (!label.trim()) return;
    const q = isCat
      ? supabase.from("categories").insert({ tournament_id: tid, label: label.trim(), icon: icon.trim(), color }).select("id").single()
      : supabase.from("income_sources").insert({ tournament_id: tid, label: label.trim(), icon: icon.trim() }).select("id").single();
    const res = await q;
    if (await run(Promise.resolve(res))) {
      setIcon(""); setLabel(""); setColor(C.green);
      if (res.data) onAdded?.(res.data.id);
    }
  }

  return (
    <Modal title={isCat ? "Categories" : "Income Sources"} icon={isCat ? "🗂️" : "💼"} onClose={onClose} zIndex={zIndex}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {items.length === 0 && (
          <EmptyState>{isCat ? "No categories yet. Add your first one below." : "No income sources yet. Add your first one below."}</EmptyState>
        )}
        {items.map((it) => (
          <Row key={it.id} item={it} isCat={isCat} run={run} />
        ))}
      </div>

      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        Add {isCat ? "category" : "source"}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <IconButton value={icon} open={picking} onClick={() => setPicking((p) => !p)} />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        {isCat && <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={colorInput} />}
        <Btn onClick={add} disabled={!label.trim()}>Add</Btn>
      </div>
      {picking && <IconGrid value={icon} onPick={(v) => { setIcon(v); setPicking(false); }} />}
    </Modal>
  );
}

function Row({ item, isCat, run }: { item: Item; isCat: boolean; run: Props["run"] }) {
  const [icon, setIcon] = useState(item.icon);
  const [label, setLabel] = useState(item.label);
  const [color, setColor] = useState("color" in item ? item.color : "");

  function save(patch: { icon?: string; label?: string; color?: string }) {
    const next = { icon, label, color, ...patch };
    const original = { icon: item.icon, label: item.label, color: "color" in item ? item.color : "" };
    if (next.icon === original.icon && next.label === original.label && next.color === original.color) return;
    if (!next.label.trim()) { setLabel(item.label); return; }
    void run(
      isCat
        ? supabase.from("categories").update({ icon: next.icon, label: next.label, color: next.color }).eq("id", item.id)
        : supabase.from("income_sources").update({ icon: next.icon, label: next.label }).eq("id", item.id),
    );
  }

  function remove() {
    const msg = isCat
      ? "Delete this category? Expenses using it will become uncategorized."
      : "Delete this income source? Income using it will lose its source.";
    if (!window.confirm(msg)) return;
    void run(isCat ? supabase.from("categories").delete().eq("id", item.id) : supabase.from("income_sources").delete().eq("id", item.id));
  }

  const [picking, setPicking] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <IconButton value={icon} open={picking} onClick={() => setPicking((p) => !p)} />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => save({})} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
        {isCat && <input type="color" value={color} onChange={(e) => setColor(e.target.value)} onBlur={() => save({})} style={colorInput} />}
        <button onClick={remove} title="Delete" style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, padding: "0 6px" }}>✕</button>
      </div>
      {picking && (
        <IconGrid value={icon} onPick={(v) => { setIcon(v); setPicking(false); save({ icon: v }); }} />
      )}
    </div>
  );
}

// ── Icon picker ───────────────────────────────────────────────────────────────
const ICONS = [
  "🏟️", "⚽", "🏀", "🏐", "🎾", "🏆", "🥇", "🎖️", "🟨", "🟥", "🥅", "👕",
  "🍔", "🍕", "🍽️", "☕", "💧", "🥤", "🧊", "🍰",
  "🩺", "🚑", "🧴", "🧹", "🔒", "🔧", "💡", "🔌", "🪑", "⛺",
  "🚌", "🚗", "✈️", "🏨", "⛽", "🅿️",
  "📣", "🖨️", "📸", "🎥", "🎤", "🎵", "🎈", "🎁", "🎨", "📱", "💻", "📦",
  "💰", "💵", "💳", "🏦", "🤝", "🎟️", "🧾", "📝", "➕",
];

function IconButton({ value, open, onClick }: { value: string; open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Choose icon" style={{
      width: 64, height: 40, flexShrink: 0, cursor: "pointer",
      background: C.surface, border: `1px solid ${open ? C.green : C.border}`, borderRadius: 8,
      color: value ? C.text : C.muted, fontSize: value ? 18 : 12, fontFamily: "inherit",
    }}>
      {value || "Icon ▾"}
    </button>
  );
}

function IconGrid({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))", gap: 4,
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginTop: 6,
    }}>
      {ICONS.map((ic) => (
        <button key={ic} type="button" onClick={() => onPick(ic)} style={{
          height: 36, fontSize: 18, cursor: "pointer", borderRadius: 6,
          background: value === ic ? C.green + "22" : "transparent",
          border: `1px solid ${value === ic ? C.green : "transparent"}`,
        }}>{ic}</button>
      ))}
      <button type="button" onClick={() => onPick("")} title="No icon" style={{
        height: 36, fontSize: 12, cursor: "pointer", borderRadius: 6, color: C.muted, fontFamily: "inherit",
        background: value === "" ? C.green + "22" : "transparent",
        border: `1px solid ${value === "" ? C.green : "transparent"}`,
      }}>None</button>
    </div>
  );
}
