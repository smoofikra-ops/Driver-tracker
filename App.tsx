import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Driver, OrderInput, DailyReportData, MonthlyReportData, ToastMessage } from './types';
import { getDrivers, addOrder, getDailyReport, getMonthlyReport, getMonthlyReportCsvUrl, isDemoMode, resetAllOrders, resetCurrentMonthOrders } from './services/apiService';

// --- ICONS ---
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const SuccessIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const StarIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404.434 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

const InfoIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
);

// --- UTILITY FUNCTIONS ---
const getRiyadhDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));

const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatMonthForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}


// --- UI SUB-COMPONENTS ---

const DemoModeBanner: React.FC = () => {
  if (!isDemoMode()) {
    return null;
  }
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md" role="alert">
      <div className="flex">
        <div className="py-1"><InfoIcon className="w-6 h-6 me-3"/></div>
        <div>
          <p className="font-bold">وضع تجريبي (Demo Mode)</p>
          <p className="text-sm">أنت حاليًا في الوضع التجريبي. لن يتم حفظ أي بيانات بشكل دائم. لتفعيل الحفظ، الرجاء اتباع التعليمات وإعداد رابط Google Apps Script في ملف `services/apiService.ts`.</p>
        </div>
      </div>
    </div>
  );
};


interface OrderFormProps {
  drivers: Driver[];
  onSubmit: (order: OrderInput) => void;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  addToast: (type: 'success' | 'error', message: string) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ drivers, onSubmit, isLoading, selectedDate, onDateChange, addToast }) => {
    const [driver, setDriver] = useState('');
    const [ordersCount, setOrdersCount] = useState<number | ''>('');

    useEffect(() => {
        if(drivers.length > 0 && !driver) {
            setDriver(drivers[0].name);
        }
    }, [drivers, driver]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!driver || ordersCount === '' || ordersCount < 0) {
            addToast('error', 'الرجاء ملء جميع الحقول بقيم صحيحة.');
            return;
        }
        onSubmit({ date: selectedDate, driver, orders_count: Number(ordersCount) });
        setOrdersCount('');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">إدخال طلبات اليوم</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-600 mb-1">التاريخ</label>
                    <input
                        type="date"
                        id="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="driver" className="block text-sm font-medium text-gray-600 mb-1">المندوب</label>
                    <select
                        id="driver"
                        value={driver}
                        onChange={(e) => setDriver(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                    >
                        {drivers.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="orders_count" className="block text-sm font-medium text-gray-600 mb-1">عدد الطلبات</label>
                    <input
                        type="number"
                        id="orders_count"
                        value={ordersCount}
                        onChange={(e) => setOrdersCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="مثال: 120"
                        min="0"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
                >
                    {isLoading ? 'جارِ الحفظ...' : 'حفظ'}
                </button>
            </form>
        </div>
    );
};

// Chart Component
interface DailyOrdersChartProps {
  data: DailyReportData[];
}
const DailyOrdersChart: React.FC<DailyOrdersChartProps> = ({ data }) => {
    const chartData = useMemo(() => data.filter(d => d.ordersToday > 0).sort((a,b) => b.ordersToday - a.ordersToday), [data]);
    const maxOrders = useMemo(() => Math.max(...chartData.map(d => d.ordersToday), 1), [chartData]);
    
    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg"><p className="text-gray-500">لا توجد طلبات لعرضها.</p></div>
    }

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-600 mb-3">طلبات المندوبين اليوم</h3>
            <div className="space-y-4">
                {chartData.map((item) => (
                    <div key={item.driver} className="group animate-fade-in">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.driver}</span>
                            <span className="text-sm font-bold text-blue-600 font-mono">{item.ordersToday}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${(item.ordersToday / maxOrders) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// Redesigned List Component
interface DailyDriverListProps {
  data: DailyReportData[];
}
const DailyDriverList: React.FC<DailyDriverListProps> = ({ data }) => {
    return (
        <div>
            <h3 className="text-lg font-bold text-gray-600 mb-3">أداء المندوبين اليوم</h3>
            <ul className="space-y-2">
                {data.map((item, index) => (
                    <li key={item.driver} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center">
                                <span className="text-lg font-bold text-gray-400 w-6 text-center me-3">{index + 1}</span>
                                <div>
                                    <p className="font-bold text-gray-800">{item.driver}</p>
                                    <p className="text-xs text-gray-500">إجمالي الشهر: {item.monthTotalOrders}</p>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-green-600 font-mono">{item.commissionToday.toFixed(2)} <span className="text-xs">ريال</span></p>
                                <p className="text-sm text-gray-500 font-mono">{item.ordersToday} <span className="text-xs">طلب</span></p>
                            </div>
                        </div>
                        {item.thresholdWasCrossedToday && (
                             <div className="mt-2 ms-9 flex items-center text-xs font-semibold p-1 rounded-full bg-yellow-200 text-yellow-800 animate-pulse">
                                <StarIcon className="w-4 h-4 me-1 flex-shrink-0" />
                                <span className="leading-tight">وصل إلى 250 طلب هذا الشهر اليوم!</span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};


// New container component for analytics
interface DailyAnalyticsProps {
  data: DailyReportData[];
  date: string;
}
const DailyAnalytics: React.FC<DailyAnalyticsProps> = ({ data, date }) => {
    const formattedDate = useMemo(() => new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }), [date]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-700">تحليل يوم ميلادك <span className="text-yellow-500">🎉</span></h2>
            <p className="text-sm text-gray-500 mb-5">يتم عرض بيانات تاريخ: <span className="font-semibold">{formattedDate}</span></p>
            {data.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد بيانات لهذا اليوم.</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <DailyDriverList data={data} />
                    <DailyOrdersChart data={data} />
                </div>
            )}
        </div>
    );
};


interface MonthlyReportProps {
  data: MonthlyReportData[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}
const MonthlyReport: React.FC<MonthlyReportProps> = ({ data, selectedMonth, onMonthChange }) => {
    
    const handleExport = () => {
        const url = getMonthlyReportCsvUrl(selectedMonth);
        if (url !== '#') {
            window.open(url, '_blank');
        } else {
            alert(isDemoMode() ? 'تصدير CSV غير متاح في الوضع التجريبي.' : 'يرجى ضبط رابط الواجهة البرمجية أولاً في ملف services/apiService.ts');
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-gray-700">التقرير الشهري</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                     <button 
                        onClick={handleExport}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 transition-colors"
                    >
                        تصدير CSV
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                        <tr>
                            <th