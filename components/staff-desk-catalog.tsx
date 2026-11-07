"use client";

import { useState } from "react";
import { StaffDeskItems } from "@/components/staff-desk-items";
import { StaffDeskStock } from "@/components/staff-desk-stock";
import { useStaffLocale } from "@/components/staff-locale";
import type { DeskItemCategory } from "@/lib/desk-items";
import type {
  DeskCountedItem,
  DeskSellableItem,
  DeskStockMovement,
} from "@/lib/desk-ops-data";

type CatalogTab = "menu" | "stock";

export function StaffDeskCatalog({
  sellables,
  countedItems,
  categories,
  movements,
  initialQuery = "",
  initialCategory = "",
  initialOpenId = null,
}: {
  sellables: DeskSellableItem[];
  countedItems: DeskCountedItem[];
  categories: DeskItemCategory[];
  movements: DeskStockMovement[];
  initialQuery?: string;
  initialCategory?: string;
  initialOpenId?: string | null;
}) {
  const { t } = useStaffLocale();
  const [tab, setTab] = useState<CatalogTab>(initialOpenId ? "stock" : "menu");

  return (
    <div className="staff-desk__catalog">
      <div className="staff-desk__tabs" role="tablist" aria-label={t("items.title")}>
        <button
          aria-selected={tab === "menu"}
          className={`staff-desk__tab${tab === "menu" ? " is-active" : ""}`}
          onClick={() => setTab("menu")}
          role="tab"
          type="button"
        >
          {t("items.catalog")}
        </button>
        <button
          aria-selected={tab === "stock"}
          className={`staff-desk__tab${tab === "stock" ? " is-active" : ""}`}
          onClick={() => setTab("stock")}
          role="tab"
          type="button"
        >
          {t("stock.title")}
        </button>
      </div>

      <div
        className="staff-desk__catalog-pane"
        hidden={tab !== "menu"}
        role="tabpanel"
      >
        <StaffDeskItems
          categories={categories}
          countedItems={countedItems}
          initialCategory={initialCategory}
          initialQuery={initialQuery}
          sellables={sellables}
        />
      </div>

      <div
        className="staff-desk__catalog-pane"
        hidden={tab !== "stock"}
        role="tabpanel"
      >
        <StaffDeskStock
          initialOpenId={tab === "stock" ? initialOpenId : null}
          items={countedItems}
          movements={movements}
          sellables={sellables}
        />
      </div>
    </div>
  );
}
