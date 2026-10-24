# Eventbudgeter

Convert the React code below into a full-stack app. Keep the design identical (dark green pitch stripes, Bebas Neue + Barlow fonts, green glow, category breakdown bars, KPI strip, financial summary card, add/edit/delete modals). Don't redesign anything.

The code already has all sample data and default categories removed on purpose. Do NOT add any pre-filled data, default categories, default income sources, or demo entries anywhere (code, seed functions, or database). New users start with a blank slate: empty tournament name (placeholder only), total budget 0, no categories, no income sources, no expenses, no income. Show friendly empty states, and when no categories exist, show an "Add category" button inside the expense form (same for income sources).

Use Supabase:

- Email/password login page; only logged-in users see the app.

- Tables: tournaments (owner_id default auth.uid(), name, total_budget), categories (label, icon, color), income_sources (label, icon), expenses (category_id, label, budgeted, spent, notes), income (source_id, label, expected, received, notes). Child tables linked by tournament_id.

- RLS: users can only access tournaments they own and their child rows. The tournaments SELECT policy must allow owner_id = auth.uid() directly, not only through a members table.

- Everything editable saves instantly and loads on refresh: tournament name (click to rename), total budget, expenses, income, categories and income sources (add, rename, change icon/color, delete).

- Multiple tournaments per user with a switcher and a "New tournament" button.

SHARING: add an "Invite" button where the owner can invite someone by email as Editor (can edit) or Viewer (read-only). Invited users log in and see that tournament. Use a tournament_members table (tournament_id, user_id, role), and add the owner as a member automatically via trigger.

Keep the code minimal. No extra features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://eventbudgeter.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/469951fd-1fcc-450a-bcac-989e2416260d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
