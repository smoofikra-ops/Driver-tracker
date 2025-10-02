import type { OrderInput, Driver, DailyReportData, MonthlyReportData } from '../types';

// ====================================================================================
// هام: استبدل هذا الرابط برابط Web App الخاص بك بعد نشره من Google Apps Script
// IMPORTANT: Replace this placeholder with your actual Google Apps Script Web App URL after deployment.
// ====================================================================================
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
// ====================================================================================


// --- DEMO MODE MOCK DATA & LOGIC ---
// This section is activated if the WEB_APP_URL is not configured.

export const isDemoMode = () => WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID');

const mockDrivers: Driver[] = [
    { name: 'ابو خضر', isActive: true },
    { name: 'ابو مريم', isActive: true },
    { name: 'رمضان', isActive: true },
    { name: 'بلال', isActive: true },
    { name: 'رباح', isActive: true },
    { name: 'سامي', isActive: true },
];

const mockOrders: OrderInput[] = [];

// Initialize with some data for today to make it look alive
const getMockDate = () => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const resetMockData = () => {
    mockOrders.length = 0; // Clear the array
    mockOrders.push({ date: getMockDate(), driver: 'ابو خضر', orders_count: 25 });
    mockOrders.push({ date: getMockDate(), driver: 'ابو مريم', orders_count: 18 });
    mockOrders.push({ date: getMockDate(), driver: 'رمضان', orders_count: 30 });
    mockOrders.push({ date: getMockDate(), driver: 'بلال', orders_count: 12 });
    mockOrders.push({ date: getMockDate(), driver: 'رباح', orders_count: 21 });
    mockOrders.push({ date: getMockDate(), driver: 'سامي', orders_count: 17 });
}
resetMockData();


function calculateCommissions(orders: OrderInput[]): MonthlyReportData[] {
    const monthlyReportData: { [key: string]: MonthlyReportData } = {};

    for (const driver of mockDrivers.filter(d => d.isActive).map(d => d.name)) {
        monthlyReportData[driver] = {
            driver: driver,
            totalOrders: 0,
            tier1Orders: 0,
            tier1Commission: 0,
            tier2Orders: 0,
            tier2Commission: 0,
            totalCommission: 0,
        };
    }

    const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const order of sortedOrders) {
        if (!monthlyReportData[order.driver]) continue;

        const currentTotal = monthlyReportData[order.driver].totalOrders;
        
        let tier1ForThisEntry = 0;
        
        if (currentTotal < 250) {
            const ordersToGoInTier1 = 250 - currentTotal;
            tier1ForThisEntry = Math.min(order.orders_count, ordersToGoInTier1);
        }
        
        const tier2ForThisEntry = order.orders_count - tier1ForThisEntry;

        monthlyReportData[order.driver].tier1Orders += tier1ForThisEntry;
        monthlyReportData[order.driver].tier2Orders += tier2ForThisEntry;
        monthlyReportData[order.driver].totalOrders += order.orders_count;
    }
    
    for (const driverName in monthlyReportData) {
        const report = monthlyReportData[driverName];
        report.tier1Commission = report.tier1Orders * 3;
        report.tier2Commission = report.tier2Orders * 4;
        report.totalCommission = report.tier1Commission + report.tier2Commission;
    }

    return Object.values(monthlyReportData);
}

async function handleMockRequest<T>(endpoint: string, payload?: any): Promise<T> {
    console.log(`[DEMO MODE] Handling request for ${endpoint}`, payload);
    // Simulate network delay
    await new Promise(res => setTimeout(res, 300));

    switch (endpoint) {
        case 'getDrivers':
            return Promise.resolve(mockDrivers as T);

        case 'addOrder':
            mockOrders.push(payload as OrderInput);
            return Promise.resolve({ message: 'تم الحفظ في الوضع التجريبي بنجاح.' } as T);
        
        case 'getDailyReport': {
            const { date } = payload;
            const month = date.substring(0, 7);
            const allMonthOrders = mockOrders.filter(o => o.date.startsWith(month));
            const fullMonthReports = calculateCommissions(allMonthOrders);

            const dailyReports: DailyReportData[] = [];
            
            for (const driver of mockDrivers.filter(d => d.isActive)) {
                const ordersForDate = mockOrders.filter(o => o.driver === driver.name && o.date === date);
                const ordersToday = ordersForDate.reduce((sum, o) => sum + o.orders_count, 0);

                const ordersForMonthBeforeToday = mockOrders.filter(o => 
                    o.driver === driver.name && 
                    o.date.startsWith(month) && 
                    new Date(o.date) < new Date(date)
                );
                const totalBeforeToday = ordersForMonthBeforeToday.reduce((sum, o) => sum + o.orders_count, 0);

                const currentMonthTotal = totalBeforeToday + ordersToday;
                const hitThreshold = currentMonthTotal >= 250;
                const thresholdWasCrossedToday = totalBeforeToday < 250 && currentMonthTotal >= 250;
                
                let commissionToday = 0;
                if (ordersToday > 0) {
                    const ordersToGoInTier1 = Math.max(0, 250 - totalBeforeToday);
                    const tier1Today = Math.min(ordersToday, ordersToGoInTier1);
                    const tier2Today = ordersToday - tier1Today;
                    commissionToday = (tier1Today * 3) + (tier2Today * 4);
                }
                
                const driverMonthReport = fullMonthReports.find(r => r.driver === driver.name);

                if (ordersToday > 0 || (driverMonthReport && driverMonthReport.totalOrders > 0)) {
                    dailyReports.push({
                        driver: driver.name,
                        ordersToday,
                        commissionToday,
                        monthTotalOrders: driverMonthReport?.totalOrders || 0,
                        monthTotalCommission: driverMonthReport?.totalCommission || 0,
                        hitThreshold,
                        thresholdWasCrossedToday,
                    });
                }
            }
            return Promise.resolve(dailyReports as T);
        }

        case 'getMonthlyReport': {
            const { month } = payload; // YYYY-MM
            const ordersForMonth = mockOrders.filter(o => o.date.startsWith(month));
            return Promise.resolve(calculateCommissions(ordersForMonth) as T);
        }
        
        case 'resetAllData':
            resetMockData();
            return Promise.resolve({ message: 'تم تصفير جميع الطلبات في الوضع التجريبي بنجاح.' } as T);
            
        case 'resetMonthData': {
            const { month } = payload;
            const initialCount = mockOrders.length;
            const ordersToKeep = mockOrders.filter(o => !o.date.startsWith(month));
            mockOrders.length = 0; // Clear the array
            mockOrders.push(...ordersToKeep);
            console.log(`[DEMO MODE] Reset month ${month}. Removed ${initialCount - mockOrders.length} orders.`);
            return Promise.resolve({ message: `تم تصفير طلبات الشهر المحدد بنجاح.` } as T);
        }

        default:
            return Promise.reject(new Error(`Unhandled mock endpoint: ${endpoint}`));
    }
}


/**
 * Helper function to handle API requests to a Google Apps Script Web App.
 * It uses a routing pattern where the desired action is passed as a parameter.
 */
async function apiRequest<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', payload?: any): Promise<T> {
  if (isDemoMode()) {
    return handleMockRequest<T>(endpoint, payload);
  }

  const url = new URL(WEB_APP_URL);
  const options: RequestInit = { method };

  try {
    let response: Response;
    if (method === 'POST') {
      options.body = JSON.stringify({ endpoint, payload });
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // Required for some Apps Script versions
      response = await fetch(url.toString(), options);
    } else { // GET
      url.searchParams.append('endpoint', endpoint);
      if (payload) {
        Object.keys(payload).forEach(key => url.searchParams.append(key, payload[key]));
      }
      response = await fetch(url.toString());
    }

    if (!response.ok) {
      throw new Error(`خطأ في الشبكة: ${response.statusText} (${response.status})`);
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'حدث خطأ غير معروف في الخادم');
    }

    return result.data as T;
  } catch (error) {
    console.error(`API Request Failed for endpoint [${endpoint}]:`, error);
    // Re-throw a more user-friendly message
    if (error instanceof Error) {
        throw new Error(`فشل الاتصال بالخادم: ${error.message}`);
    }
    throw new Error('فشل الاتصال بالخادم.');
  }
}

export const getDrivers = (): Promise<Driver[]> => {
  return apiRequest<Driver[]>('getDrivers', 'GET');
};

export const addOrder = (order: OrderInput): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('addOrder', 'POST', order);
};

export const getDailyReport = (date: string): Promise<DailyReportData[]> => {
  return apiRequest<DailyReportData[]>('getDailyReport', 'GET', { date });
};

export const getMonthlyReport = (month: string): Promise<MonthlyReportData[]> => {
  return apiRequest<MonthlyReportData[]>('getMonthlyReport', 'GET', { month });
};

export const getMonthlyReportCsvUrl = (month: string): string => {
    if (isDemoMode()) {
        return '#';
    }
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('endpoint', 'exportMonthlyCsv');
    url.searchParams.append('month', month);
    return url.toString();
};

export const resetAllOrders = (): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('resetAllData', 'POST');
};

export const resetCurrentMonthOrders = (month: string): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('resetMonthData', 'POST', { month });
};