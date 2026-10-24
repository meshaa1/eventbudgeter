import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type Tournament = Tables<"tournaments">;
export type Category = Tables<"categories">;
export type IncomeSource = Tables<"income_sources">;
export type Expense = Tables<"expenses">;
export type Income = Tables<"income">;
export type MemberRole = Database["public"]["Enums"]["member_role"];

export async function fetchTournaments(): Promise<Tournament[]> {
  // Claim any pending invites sent to this user's email first.
  await supabase.rpc("accept_invites");
  const { data, error } = await supabase.from("tournaments").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function fetchTournamentData(tid: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id ?? "";
  const [cats, srcs, exps, incs, member] = await Promise.all([
    supabase.from("categories").select("*").eq("tournament_id", tid).order("created_at"),
    supabase.from("income_sources").select("*").eq("tournament_id", tid).order("created_at"),
    supabase.from("expenses").select("*").eq("tournament_id", tid).order("created_at"),
    supabase.from("income").select("*").eq("tournament_id", tid).order("created_at"),
    supabase.from("tournament_members").select("role").eq("tournament_id", tid).eq("user_id", uid).maybeSingle(),
  ]);
  for (const r of [cats, srcs, exps, incs, member]) if (r.error) throw r.error;
  return {
    categories: cats.data ?? [],
    sources: srcs.data ?? [],
    expenses: exps.data ?? [],
    income: incs.data ?? [],
    role: (member.data?.role ?? "viewer") as MemberRole,
  };
}

export async function fetchMembers(tid: string) {
  const { data, error } = await supabase.rpc("list_members", { _tournament_id: tid });
  if (error) throw error;
  return data ?? [];
}
