// Vertical Protocol — shop catalog shared by the API route (purchase
// validation) and the client (rendering). Pure data: safe for both bundles.

export interface ShopItem {
  slug: string;
  name: string;
  description: string;
  cost: number;
  kind: "heart-refill" | "streak-freeze";
  emoji: string;
  accent: "rose" | "teal";
}

export const SHOP_CATALOG: ShopItem[] = [
  {
    slug: "heart-refill",
    name: "Recarregar Vidas",
    description: "Restaura todas as suas vidas instantaneamente.",
    cost: 5,
    kind: "heart-refill",
    emoji: "❤️",
    accent: "rose",
  },
  {
    slug: "streak-freeze",
    name: "Congela Ofensiva",
    description: "Protege sua ofensiva por um dia perdido. Consumido automaticamente.",
    cost: 10,
    kind: "streak-freeze",
    emoji: "🧊",
    accent: "teal",
  },
];

export const SHOP_BY_SLUG: Record<string, ShopItem> = Object.fromEntries(
  SHOP_CATALOG.map((item) => [item.slug, item])
);
