<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- The budget UI uses inline styles driven by the `C` token object in `src/components/budget/ui.tsx`; keep colors there (mirrored in `src/styles.css` :root) so the original design stays pixel-identical.
- All data access goes through the browser Supabase client with RLS; access is decided by `is_tournament_member` / `can_edit_tournament` / `is_tournament_owner` SQL helpers, so never duplicate permission logic only in the UI.
- Membership rows are written only by security-definer SQL (owner trigger, `invite_member`, `accept_invites`); clients have SELECT-only grants on `tournament_members` / `tournament_invites` to prevent self-granting access.
- Invites for unregistered emails are stored as pending and claimed via `accept_invites()` on load, because no email-sending is set up.
- No seed or default data anywhere (categories, sources, entries); new users start blank.
