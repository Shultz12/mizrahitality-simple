/** A bundled picture the owner can pick for the Image block, served from public/stock/. */
export interface StockImage {
  id: string;
  label: string;
  /** Path under the Builder app's public/ directory. */
  src: string;
}

export const STOCK_IMAGES: readonly StockImage[] = [
  { id: "cafe", label: "Café", src: "/stock/cafe.svg" },
  { id: "restaurant", label: "Restaurant", src: "/stock/restaurant.svg" },
  { id: "bar", label: "Bar", src: "/stock/bar.svg" },
  { id: "hotel", label: "Hotel", src: "/stock/hotel.svg" },
];
