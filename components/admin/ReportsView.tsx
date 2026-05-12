import React, { useState, useEffect } from 'react';
import { getReportsData, ReportsData } from '../../services/firestoreService';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportsView: React.FC = () => {
    const [data, setData] = useState<ReportsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await getReportsData(fromDate || undefined, toDate || undefined);
            setData(result);
        } catch (e) {
            console.error('Failed to fetch reports:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [fromDate, toDate]);

    // Aggregate by product type
    const revenueByType = data ? data.bookings.reduce((acc, b) => {
        b.items.forEach(item => {
            const type = item.productType || 'course';
            acc[type] = (acc[type] || 0) + item.price * item.quantity;
            // Add add-ons
            if (item.addOns) {
                item.addOns.forEach(a => {
                    acc[type] = (acc[type] || 0) + a.price * item.quantity;
                });
            }
        });
        return acc;
    }, {} as Record<string, number>) : {};

    // Top products
    const productRevenue = data ? data.bookings.reduce((acc, b) => {
        b.items.forEach(item => {
            const key = item.productName;
            if (!acc[key]) acc[key] = { name: key, type: item.productType || 'course', revenue: 0, units: 0 };
            acc[key].revenue += item.price * item.quantity;
            acc[key].units += item.quantity;
        });
        return acc;
    }, {} as Record<string, { name: string; type: string; revenue: number; units: number }>) : {};

    const topProducts = Object.values(productRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const maxBarValue = Math.max(...Object.values(revenueByType), 1);

    const handleExportCSV = () => {
        if (!data) return;
        const headers = ['Booking ID', 'Customer', 'Date', 'Total', 'Items'];
        const rows = data.bookings.map(b => [
            b.id,
            b.customerFullName,
            new Date((b.bookingDate as any)?.seconds * 1000).toLocaleDateString(),
            b.totalAmount.toFixed(2),
            b.items.map(i => `${i.productName} x${i.quantity}`).join('; '),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'sales_report.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const typeLabels: Record<string, string> = {
        course: 'Courses',
        event_ticket: 'Event Tickets',
        entrance_ticket: 'Entrance Tickets',
    };

    const barColors: Record<string, string> = {
        course: 'bg-blue-500',
        event_ticket: 'bg-green-500',
        entrance_ticket: 'bg-purple-500',
    };

    return (
        <div className="space-y-6">
            {/* Date Filter */}
            <div className="bg-white p-4 rounded-xl shadow-md flex flex-wrap items-center gap-4">
                <label className="text-sm font-medium text-slate-700">From:</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
                <label className="text-sm font-medium text-slate-700">To:</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
                <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">Refresh</button>
                <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-100 ml-auto">Export CSV</button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-indigo-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">RM{data.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-emerald-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">{data.totalBookings}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-amber-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items Sold</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">{data.totalItems}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Order Value</p>
                            <p className="text-2xl font-extrabold text-slate-900 mt-1">
                                RM{data.totalBookings > 0 ? (data.totalRevenue / data.totalBookings).toFixed(2) : '0.00'}
                            </p>
                        </div>
                    </div>

                    {/* Revenue by Product Type */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue by Product Type</h3>
                        {Object.keys(revenueByType).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(revenueByType).map(([type, revenue]) => (
                                    <div key={type} className="flex items-center gap-3">
                                        <span className="w-28 text-sm font-medium text-slate-600">{typeLabels[type] || type}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${barColors[type] || 'bg-slate-400'}`}
                                                style={{ width: `${(revenue / maxBarValue) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 w-24 text-right">RM{revenue.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No paid bookings in selected date range.</p>
                        )}
                    </div>

                    {/* Top Products Table */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Top Products</h3>
                        {topProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Product</th>
                                            <th className="px-4 py-3 text-left">Type</th>
                                            <th className="px-4 py-3 text-right">Units Sold</th>
                                            <th className="px-4 py-3 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {topProducts.map((p, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${barColors[p.type]?.replace('bg-', 'bg-').replace('500', '100') || 'bg-slate-100'} ${barColors[p.type]?.replace('bg-', 'text-').replace('500', '700') || 'text-slate-700'}`}>
                                                        {typeLabels[p.type] || p.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">{p.units}</td>
                                                <td className="px-4 py-3 text-right font-mono">RM{p.revenue.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No data available.</p>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-slate-500 text-center py-8">Failed to load report data.</p>
            )}
        </div>
    );
};

export default ReportsView;
