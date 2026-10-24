import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/components/budget/BudgetApp";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Tournament Budget — Track expenses & income" },
      { name: "description", content: "Plan your football tournament budget: expenses by category, income, and a live financial summary." },
      { property: "og:title", content: "Tournament Budget — Track expenses & income" },
      { property: "og:description", content: "Plan your football tournament budget: expenses by category, income, and a live financial summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetApp,
});
