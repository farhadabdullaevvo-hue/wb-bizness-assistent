const WB_STATS_BASE = "https://statistics-api.wildberries.ru/api/v1/supplier";

function wbHeaders(): HeadersInit {
  return { Authorization: process.env.WB_API_TOKEN ?? "" };
}

export interface WBSale {
  date: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  totalPrice: number;
  discountPercent: number;
  isSupply: boolean;
  isRealization: boolean;
  saleID: string;
  forPay: number;
  finishedPrice: number;
  priceWithDisc: number;
  nmId: number;
  subject: string;
  category: string;
  brand: string;
  IsStorno: number;
}

export interface WBOrder {
  date: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  totalPrice: number;
  discountPercent: number;
  warehouseName: string;
  nmId: number;
  subject: string;
  category: string;
  brand: string;
  isCancel: boolean;
  finishedPrice: number;
  priceWithDisc: number;
  srid: string;
}

export interface WBStock {
  lastChangeDate: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  quantity: number;
  quantityFull: number;
  quantityNotInOrders: number;
  warehouseName: string;
  nmId: number;
  subject: string;
  category: string;
  brand: string;
  Price: number;
  Discount: number;
}

async function wbFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: wbHeaders() });
  if (res.status === 429) throw Object.assign(new Error("WB API rate limit (429)"), { status: 429 });
  if (!res.ok) throw new Error(`WB API error ${res.status}`);
  return res;
}

export async function getSales(dateFrom: string): Promise<WBSale[]> {
  const res = await wbFetch(`${WB_STATS_BASE}/sales?dateFrom=${dateFrom}&flag=0`);
  return res.json();
}

export async function getOrders(dateFrom: string): Promise<WBOrder[]> {
  const res = await wbFetch(`${WB_STATS_BASE}/orders?dateFrom=${dateFrom}&flag=0`);
  return res.json();
}

export async function getStocks(dateFrom: string): Promise<WBStock[]> {
  const res = await wbFetch(`${WB_STATS_BASE}/stocks?dateFrom=${dateFrom}`);
  return res.json();
}

export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
