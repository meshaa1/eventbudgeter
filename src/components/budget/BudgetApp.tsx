import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchTournamentData, fetchTournaments, type Expense, type Income } from "@/lib/budget-api";
import { BEBAS, Bar, Btn, C, EmptyState, Field, Input, Modal, PitchStripes, fmt } from "./ui";
import { ListManager } from "./ListManager";
import { InviteModal } from "./InviteModal";

type Result = PromiseLike<{ error: { message: string } | null }>;
const SELECTED_KEY = "tb:selected-tournament";
const NO_CAT = { icon: "", color: C.muted, label: "" };

type ExpForm = { category_id: string | null; label: string; budgeted: string; spent: string; notes: string };
type IncForm = { source_id: string | null; label: string; expected: string; received: string; notes: string };
const blankExp: ExpForm = { category_id: null, label: "", budgeted: "", spent: "", notes: "" };
const blankInc: IncForm = { source_id: null, label: "", expected: "", received: "", notes: "" };

const pill = { padding: "7px 14px", fontSize: 14 } as const;

export function BudgetApp() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tournamentsQ = useQuery({ queryKey: ["tournaments"], queryFn: fetchTournaments });
  const tournaments = tournamentsQ.data ?? [];

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setSelected(localStorage.getItem(SELECTED_KEY)); }, []);
  const t = tournaments.find((x) => x.id === selected) ?? tournaments[0] ?? null;
  const tid = t?.id ?? null;
  function select(id: string) { setSelected(id); localStorage.setItem(SELECTED_KEY, id); }

  const dataQ = useQuery({ queryKey: ["t", tid], queryFn: () => fetchTournamentData(tid!), enabled: !!tid });
  const categories = dataQ.data?.categories ?? [];
  const sources = dataQ.data?.sources ?? [];
  const expenses = dataQ.data?.expenses ?? [];
  const income = dataQ.data?.income ?? [];
  const role = dataQ.data?.role ?? "viewer";
  const canEdit = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");

  const [showExpModal, setShowExpModal] = useState(false);
  const [showIncModal, setShowIncModal] = useState(false);
  const [editExp, setEditExp] = useState<string | null>(null);
  const [editInc, setEditInc] = useState<string | null>(null);
  const [expForm, setExpForm] = useState<ExpForm>(blankExp);
  const [incForm, setIncForm] = useState<IncForm>(blankInc);
  const [manager, setManager] = useState<null | { kind: "category" | "source"; fromForm: boolean }>(null);
  const [showInvite, setShowInvite] = useState(false);

  async function run(op: Result, key: unknown[] = ["t", tid]) {
    const { error } = await op;
    if (error) { toast.error(error.message); return false; }
    await qc.invalidateQueries({ queryKey: key });
    return true;
  }

  async function newTournament() {
    const { data, error } = await supabase.from("tournaments").insert({ name: "", total_budget: 0 }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["tournaments"] });
    select(data.id);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function commitName() {
    setEditingName(false);
    if (t && nameDraft !== t.name) void run(supabase.from("tournaments").update({ name: nameDraft.trim() }).eq("id", t.id), ["tournaments"]);
  }
  function commitBudget() {
    setEditingBudget(false);
    const val = parseFloat(budgetDraft) || 0;
    if (t && val !== Number(t.total_budget)) void run(supabase.from("tournaments").update({ total_budget: val }).eq("id", t.id), ["tournaments"]);
  }

  // Totals
  const totalBudget = Number(t?.total_budget ?? 0);
  const totalBudgeted = expenses.reduce((s, e) => s + (Number(e.budgeted) || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (Number(e.spent) || 0), 0);
  const totalExpected = income.reduce((s, i) => s + (Number(i.expected) || 0), 0);
  const totalReceived = income.reduce((s, i) => s + (Number(i.received) || 0), 0);
  const netBudget = totalBudget - totalBudgeted;
  const netCash = totalReceived - totalSpent;
  const overallPct = (totalBudgeted / (totalBudget || 1)) * 100;

  async function saveExp() {
    if (!expForm.label || !tid) return;
    const entry = {
      category_id: expForm.category_id, label: expForm.label, notes: expForm.notes,
      budgeted: parseFloat(expForm.budgeted) || 0, spent: parseFloat(expForm.spent) || 0,
    };
    const ok = await run(editExp
      ? supabase.from("expenses").update(entry).eq("id", editExp)
      : supabase.from("expenses").insert({ ...entry, tournament_id: tid }));
    if (ok) { setShowExpModal(false); setEditExp(null); setExpForm(blankExp); }
  }

  async function saveInc() {
    if (!incForm.label || !tid) return;
    const entry = {
      source_id: incForm.source_id, label: incForm.label, notes: incForm.notes,
      expected: parseFloat(incForm.expected) || 0, received: parseFloat(incForm.received) || 0,
    };
    const ok = await run(editInc
      ? supabase.from("income").update(entry).eq("id", editInc)
      : supabase.from("income").insert({ ...entry, tournament_id: tid }));
    if (ok) { setShowIncModal(false); setEditInc(null); setIncForm(blankInc); }
  }

  async function deleteExp() {
    if (editExp && (await run(supabase.from("expenses").delete().eq("id", editExp)))) { setShowExpModal(false); setEditExp(null); }
  }
  async function deleteInc() {
    if (editInc && (await run(supabase.from("income").delete().eq("id", editInc)))) { setShowIncModal(false); setEditInc(null); }
  }

  function openNewExp() { setExpForm({ ...blankExp, category_id: categories[0]?.id ?? null }); setEditExp(null); setShowExpModal(true); }
  function openNewInc() { setIncForm({ ...blankInc, source_id: sources[0]?.id ?? null }); setEditInc(null); setShowIncModal(true); }
  function openEditExp(e: Expense) {
    if (!canEdit) return;
    setExpForm({ category_id: e.category_id, label: e.label, notes: e.notes, budgeted: String(e.budgeted), spent: String(e.spent) });
    setEditExp(e.id); setShowExpModal(true);
  }
  function openEditInc(i: Income) {
    if (!canEdit) return;
    setIncForm({ source_id: i.source_id, label: i.label, notes: i.notes, expected: String(i.expected), received: String(i.received) });
    setEditInc(i.id); setShowIncModal(true);
  }

  // Category totals for breakdown
  const catTotals: Record<string, { budgeted: number; spent: number }> = {};
  categories.forEach((c) => { catTotals[c.id] = { budgeted: 0, spent: 0 }; });
  expenses.forEach((e) => {
    const tot = e.category_id ? catTotals[e.category_id] : undefined;
    if (tot) {
      tot.budgeted += Number(e.budgeted) || 0;
      tot.spent += Number(e.spent) || 0;
    }
  });
  const totalsFor = (id: string) => catTotals[id] ?? { budgeted: 0, spent: 0 };
  const activeCategories = categories.filter((c) => totalsFor(c.id).budgeted > 0);

  const selectStyle = {
    background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8,
    padding: "7px 12px", fontFamily: "inherit", fontSize: 13, outline: "none", maxWidth: 240,
  } as const;

  const loading = tournamentsQ.isLoading;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', sans-serif", color: C.text, position: "relative" }}>
      <PitchStripes />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ── */}
        <div style={{
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(180deg, ${C.pitch}cc 0%, transparent 100%)`,
          padding: "20px 24px 16px",
        }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            {/* Tournament switcher bar */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              {tournaments.length > 0 && (
                <select value={tid ?? ""} onChange={(e) => select(e.target.value)} style={selectStyle} aria-label="Switch tournament">
                  {tournaments.map((x) => <option key={x.id} value={x.id}>{x.name || "Untitled tournament"}</option>)}
                </select>
              )}
              <Btn outline onClick={newTournament} style={pill}>+ New Tournament</Btn>
              {t && isOwner && <Btn outline onClick={() => setShowInvite(true)} style={pill}>✉️ Invite</Btn>}
              {t && dataQ.data && !canEdit && <span style={{ color: C.yellow, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>👁️ View only</span>}
              <Btn outline color={C.muted} onClick={signOut} style={{ ...pill, marginLeft: "auto" }}>Sign out</Btn>
            </div>

            {t && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>⚽ Tournament Budget</div>
                    {editingName ? (
                      <input
                        autoFocus
                        value={nameDraft}
                        placeholder="Tournament name"
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => e.key === "Enter" && commitName()}
                        style={{
                          background: "none", border: "none", borderBottom: `2px solid ${C.green}`,
                          color: C.text, fontSize: 26, fontFamily: BEBAS,
                          letterSpacing: "0.05em", outline: "none", width: "100%",
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => { if (canEdit) { setNameDraft(t.name); setEditingName(true); } }}
                        style={{
                          fontFamily: BEBAS, fontSize: 28, letterSpacing: "0.05em",
                          color: t.name ? C.white : C.muted, cursor: canEdit ? "pointer" : "default",
                          textShadow: `0 0 30px ${C.greenGlow}`,
                        }}
                        title={canEdit ? "Click to rename" : undefined}
                      >
                        {t.name || "Name your tournament"}{canEdit ? " ✏️" : ""}
                      </div>
                    )}
                  </div>

                  {/* Overall budget widget */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Budget</span>
                      {editingBudget ? (
                        <input
                          autoFocus type="number"
                          value={budgetDraft}
                          placeholder="0"
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          onBlur={commitBudget}
                          onKeyDown={(e) => e.key === "Enter" && commitBudget()}
                          style={{ background: "none", border: "none", borderBottom: `1px solid ${C.green}`, color: C.green, fontSize: 20, fontFamily: BEBAS, width: 100, textAlign: "right", outline: "none" }}
                        />
                      ) : (
                        <span
                          onClick={() => { if (canEdit) { setBudgetDraft(totalBudget ? String(totalBudget) : ""); setEditingBudget(true); } }}
                          style={{ color: C.green, fontFamily: BEBAS, fontSize: 22, cursor: canEdit ? "pointer" : "default" }}
                          title={canEdit ? "Click to set budget" : undefined}
                        >
                          {fmt(totalBudget)}
                        </span>
                      )}
                    </div>
                    <Bar pct={overallPct} color={C.green} height={6} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ color: C.muted, fontSize: 11 }}>Allocated: {fmt(totalBudgeted)}</span>
                      <span style={{ color: netBudget < 0 ? C.red : C.green, fontSize: 11, fontWeight: 600 }}>
                        {netBudget < 0 ? "Over by " + fmt(netBudget) : fmt(netBudget) + " free"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16 }}>
                  {[
                    { label: "Budgeted", val: totalBudgeted, color: C.text },
                    { label: "Spent", val: totalSpent, color: C.yellow },
                    { label: "Income Expected", val: totalExpected, color: C.green },
                    { label: "Cash In Hand", val: netCash, color: netCash >= 0 ? C.green : C.red, signed: true },
                  ].map((k) => (
                    <div key={k.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{k.label}</div>
                      <div style={{ color: k.color, fontFamily: BEBAS, fontSize: 20 }}>
                        {k.signed && k.val < 0 ? "-" : ""}{fmt(k.val)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── No tournaments ── */}
        {!loading && !t && (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
            <div style={{
              background: `linear-gradient(135deg, ${C.card} 0%, ${C.pitch} 100%)`,
              border: `1px solid ${C.green}44`, borderRadius: 14, padding: 36, textAlign: "center",
              boxShadow: `0 0 40px ${C.greenGlow}`,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚽</div>
              <div style={{ fontFamily: BEBAS, fontSize: 26, color: C.green, letterSpacing: "0.05em", marginBottom: 6 }}>No tournaments yet</div>
              <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Create your first tournament to start tracking its budget.</div>
              <Btn onClick={newTournament}>+ New Tournament</Btn>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {t && (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* ── EXPENSES panel ── */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 22, color: C.green, letterSpacing: "0.05em" }}>📋 Expenses</span>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn outline onClick={() => setManager({ kind: "category", fromForm: false })}>Categories</Btn>
                    <Btn onClick={openNewExp}>+ Add Expense</Btn>
                  </div>
                )}
              </div>

              {/* Category breakdown bars */}
              {activeCategories.length > 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
                  <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>By Category</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                    {activeCategories.map((cat) => {
                      const tt = catTotals[cat.id];
                      const pct = (tt.spent / (tt.budgeted || 1)) * 100;
                      return (
                        <div key={cat.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ color: C.text, fontSize: 12 }}>{cat.icon} {cat.label}</span>
                            <span style={{ color: C.muted, fontSize: 11 }}>{fmt(tt.spent)} / {fmt(tt.budgeted)}</span>
                          </div>
                          <Bar pct={pct} color={cat.color} height={5} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expense rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {expenses.length === 0 && (
                  <EmptyState>{canEdit ? "No expenses yet. Add one above!" : "No expenses yet."}</EmptyState>
                )}
                {expenses.map((e) => {
                  const cat = categories.find((c) => c.id === e.category_id) ?? NO_CAT;
                  const spent = Number(e.spent), budgeted = Number(e.budgeted);
                  const spentPct = (spent / (budgeted || 1)) * 100;
                  return (
                    <div key={e.id} style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: "14px 16px", cursor: canEdit ? "pointer" : "default",
                      transition: "border-color 0.15s",
                    }}
                      onMouseEnter={(el) => (el.currentTarget.style.borderColor = cat.color + "88")}
                      onMouseLeave={(el) => (el.currentTarget.style.borderColor = C.border)}
                      onClick={() => openEditExp(e)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          {cat.icon && <span style={{ color: cat.color, marginRight: 6 }}>{cat.icon}</span>}
                          <span style={{ color: C.text, fontWeight: 500 }}>{e.label}</span>
                          {e.notes && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>· {e.notes}</span>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontFamily: BEBAS, fontSize: 16, color: spentPct > 100 ? C.red : C.text }}>
                            {fmt(spent)} <span style={{ color: C.muted, fontSize: 13 }}>/ {fmt(budgeted)}</span>
                          </div>
                        </div>
                      </div>
                      <Bar pct={spentPct} color={cat.color} height={4} />
                      {spentPct > 100 && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>⚠ Over budget by {fmt(spent - budgeted)}</div>}
                      {spentPct === 100 && <div style={{ color: C.green, fontSize: 11, marginTop: 4 }}>✓ Fully paid</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── INCOME panel ── */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, marginTop: 8, gap: 8 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 22, color: C.green, letterSpacing: "0.05em" }}>💰 Income & Funding</span>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn outline onClick={() => setManager({ kind: "source", fromForm: false })}>Sources</Btn>
                    <Btn onClick={openNewInc}>+ Add Income</Btn>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {income.length === 0 && <EmptyState>No income recorded yet.</EmptyState>}
                {income.map((i) => {
                  const src = sources.find((s) => s.id === i.source_id);
                  const received = Number(i.received), expected = Number(i.expected);
                  const collectedPct = (received / (expected || 1)) * 100;
                  return (
                    <div key={i.id} style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: "14px 16px", cursor: canEdit ? "pointer" : "default",
                      transition: "border-color 0.15s",
                    }}
                      onMouseEnter={(el) => (el.currentTarget.style.borderColor = C.green + "88")}
                      onMouseLeave={(el) => (el.currentTarget.style.borderColor = C.border)}
                      onClick={() => openEditInc(i)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          {src?.icon && <span style={{ marginRight: 6 }}>{src.icon}</span>}
                          <span style={{ color: C.text, fontWeight: 500 }}>{i.label}</span>
                          {i.notes && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>· {i.notes}</span>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontFamily: BEBAS, fontSize: 16, color: C.green }}>
                            {fmt(received)} <span style={{ color: C.muted, fontSize: 13 }}>/ {fmt(expected)}</span>
                          </div>
                        </div>
                      </div>
                      <Bar pct={collectedPct} color={C.green} height={4} />
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{collectedPct.toFixed(0)}% collected</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Summary card ── */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{
                background: `linear-gradient(135deg, ${C.card} 0%, ${C.pitch} 100%)`,
                border: `1px solid ${C.green}44`,
                borderRadius: 14, padding: 22,
                boxShadow: `0 0 40px ${C.greenGlow}`,
              }}>
                <div style={{ fontFamily: BEBAS, fontSize: 20, color: C.green, letterSpacing: "0.05em", marginBottom: 16 }}>📊 Financial Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Total Allocated", val: totalBudgeted, sub: `of ${fmt(totalBudget)} budget`, barPct: (totalBudgeted / (totalBudget || 1)) * 100, barColor: C.green },
                    { label: "Total Spent", val: totalSpent, sub: `${((totalSpent / (totalBudgeted || 1)) * 100).toFixed(0)}% of allocated`, barPct: (totalSpent / (totalBudgeted || 1)) * 100, barColor: C.yellow },
                    { label: "Remaining Spend", val: totalBudgeted - totalSpent, sub: "not yet spent", barPct: ((totalBudgeted - totalSpent) / (totalBudgeted || 1)) * 100, barColor: "#42c5f5" },
                    { label: "Net Position", val: totalReceived - totalSpent, sub: totalReceived - totalSpent >= 0 ? "surplus" : "deficit", barPct: undefined, barColor: totalReceived - totalSpent >= 0 ? C.green : C.red },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: BEBAS, fontSize: 22, color: s.barColor, marginBottom: 4 }}>{s.val < 0 ? "-" : ""}{fmt(s.val)}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>{s.sub}</div>
                      {s.barPct !== undefined && <Bar pct={s.barPct} color={s.barColor} height={4} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Expense Modal ── */}
      {showExpModal && (
        <Modal title={editExp ? "Edit Expense" : "Add Expense"} icon="📋" onClose={() => { setShowExpModal(false); setEditExp(null); }}>
          <Field label="Category">
            {categories.length === 0 ? (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>No categories yet.</div>
                <Btn outline onClick={() => setManager({ kind: "category", fromForm: true })}>+ Add Category</Btn>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setExpForm((f) => ({ ...f, category_id: cat.id }))} style={{
                    background: expForm.category_id === cat.id ? cat.color + "33" : C.surface,
                    border: `1px solid ${expForm.category_id === cat.id ? cat.color : C.border}`,
                    borderRadius: 8, padding: "8px 10px", cursor: "pointer",
                    color: expForm.category_id === cat.id ? cat.color : C.muted,
                    fontSize: 12, fontFamily: "inherit", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Description">
            <Input value={expForm.label} onChange={(e) => setExpForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Field rental — Saturday" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Budgeted ($)">
              <Input type="number" value={expForm.budgeted} onChange={(e) => setExpForm((f) => ({ ...f, budgeted: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Spent / Paid ($)">
              <Input type="number" value={expForm.spent} onChange={(e) => setExpForm((f) => ({ ...f, spent: e.target.value }))} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <Input value={expForm.notes} onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any details..." />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            {editExp && <Btn color={C.red} textColor="#fff" onClick={deleteExp}>Delete</Btn>}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <Btn outline color={C.muted} onClick={() => { setShowExpModal(false); setEditExp(null); }}>Cancel</Btn>
              <Btn onClick={saveExp}>{editExp ? "Save Changes" : "Add Expense"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Income Modal ── */}
      {showIncModal && (
        <Modal title={editInc ? "Edit Income" : "Add Income"} icon="💰" onClose={() => { setShowIncModal(false); setEditInc(null); }}>
          <Field label="Source">
            {sources.length === 0 ? (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>No income sources yet.</div>
                <Btn outline onClick={() => setManager({ kind: "source", fromForm: true })}>+ Add Income Source</Btn>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {sources.map((src) => (
                  <button key={src.id} onClick={() => setIncForm((f) => ({ ...f, source_id: src.id }))} style={{
                    background: incForm.source_id === src.id ? C.green + "22" : C.surface,
                    border: `1px solid ${incForm.source_id === src.id ? C.green : C.border}`,
                    borderRadius: 8, padding: "8px 10px", cursor: "pointer",
                    color: incForm.source_id === src.id ? C.green : C.muted,
                    fontSize: 12, fontFamily: "inherit", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                    {src.icon} {src.label}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Description">
            <Input value={incForm.label} onChange={(e) => setIncForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. 8 teams × $200 entry" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Expected ($)">
              <Input type="number" value={incForm.expected} onChange={(e) => setIncForm((f) => ({ ...f, expected: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Received ($)">
              <Input type="number" value={incForm.received} onChange={(e) => setIncForm((f) => ({ ...f, received: e.target.value }))} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <Input value={incForm.notes} onChange={(e) => setIncForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. 4 teams paid so far" />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            {editInc && <Btn color={C.red} textColor="#fff" onClick={deleteInc}>Delete</Btn>}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <Btn outline color={C.muted} onClick={() => { setShowIncModal(false); setEditInc(null); }}>Cancel</Btn>
              <Btn onClick={saveInc}>{editInc ? "Save Changes" : "Add Income"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Category / source manager ── */}
      {manager && tid && (
        <ListManager
          kind={manager.kind}
          items={manager.kind === "category" ? categories : sources}
          tid={tid}
          run={(op) => run(op)}
          zIndex={300}
          onClose={() => setManager(null)}
          onAdded={(id) => {
            if (!manager.fromForm) return;
            if (manager.kind === "category") setExpForm((f) => ({ ...f, category_id: f.category_id ?? id }));
            else setIncForm((f) => ({ ...f, source_id: f.source_id ?? id }));
          }}
        />
      )}

      {showInvite && tid && <InviteModal tid={tid} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
