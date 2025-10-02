
export interface Driver {
  name: string;
  isActive: boolean;
}

export interface OrderInput {
  date: string; // YYYY-MM-DD
  driver: string;
  orders_count: number;
}

export interface DailyReportData {
  driver: string;
  ordersToday: number;
  commissionToday: number;
  monthTotalOrders: number;
  monthTotalCommission: number;
  hitThreshold: boolean;
  thresholdWasCrossedToday: boolean;
}

export interface MonthlyReportData {
  driver: string;
  totalOrders: number;
  tier1Orders: number; // up to 250
  tier1Commission: number;
  tier2Orders: number; // above 250
  tier2Commission: number;
  totalCommission: number;
}

export type ToastMessage = {
  id: number;
  type: 'success' | 'error';
  message: string;
};
