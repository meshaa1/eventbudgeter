import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMembers } from "@/lib/budget-api";
import { Btn, C, Field, Input, Modal } from "./ui";

export function InviteModal({ tid, onClose }: { tid: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const members = useQuery({ queryKey: ["members", tid], queryFn: () => fetchMembers(tid) });

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("invite_member", { _tournament_id: tid, _email: email, _role: role });
    setBusy(false);
    if (error) { setMsg({ text: error.message, ok: false }); return; }
    setMsg({
      ok: true,
      text: data === "added"
        ? `${email} now has access.`
        : `Invite saved. ${email} will see this event after signing up and logging in with this email.`,
    });
    setEmail("");
    qc.invalidateQueries({ queryKey: ["members", tid] });
  }

  return (
    <Modal title="Invite" icon="✉️" onClose={onClose}>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} />
      </Field>
      <Field label="Access">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([
            { id: "editor", label: "✏️ Editor — can edit" },
            { id: "viewer", label: "👁️ Viewer — read-only" },
          ] as const).map((r) => (
            <button key={r.id} onClick={() => setRole(r.id)} style={{
              background: role === r.id ? C.green + "22" : C.surface,
              border: `1px solid ${role === r.id ? C.green : C.border}`,
              borderRadius: 8, padding: "8px 10px", cursor: "pointer",
              color: role === r.id ? C.green : C.muted,
              fontSize: 12, fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
            }}>{r.label}</button>
          ))}
        </div>
      </Field>
      {msg && <div style={{ color: msg.ok ? C.green : C.red, fontSize: 12, marginBottom: 14 }}>{msg.text}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 20 }}>
        <Btn outline color={C.muted} onClick={onClose}>Close</Btn>
        <Btn onClick={invite} disabled={busy || !email.trim()}>Send Invite</Btn>
      </div>

      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>People with access</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(members.data ?? []).map((m) => (
          <div key={m.email} style={{ display: "flex", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
            <span style={{ color: C.text }}>{m.email}</span>
            <span style={{ color: m.pending ? C.yellow : C.muted, textTransform: "capitalize" }}>{m.role}{m.pending ? " · pending" : ""}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
