import React, { useState, useEffect, useMemo } from 'react';
import { getBookings, getCourses, getCategories } from '../../services/firestoreService';
import { Booking, Course, Category } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

const BookingsManagement: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncingId, setSyncingId] = useState<string | null>(null); // New state for automation

    const [filterCourse, setFilterCourse] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // --- NEW: Manual Sync Logic for Automation ---
    const handleManualSync = async (bookingId: string) => {
        const confirmSync = window.confirm("Deduct slots and sync this booking to Loyverse manually?");
        if (!confirmSync) return;

        setSyncingId(bookingId);
        try {
            // Calls the backend trigger we built to bypass automation issues
            const response = await fetch(`https://manualadminupdate-2n7sc53hoa-uc.a.run.app?bookingId=${bookingId}`);
            const result = await response.text();
            alert(result);
            
            // Refresh the list to show the new "paid" status
            const bookingsData = await getBookings();
            setBookings(bookingsData);
        } catch (error) {
            console.error("Manual sync failed:", error);
            alert("Failed to sync booking. Please check your internet connection.");
        } finally {
            setSyncingId(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [bookingsData, coursesData, categoriesData] = await Promise.all([
                    getBookings(),
                    getCourses(),
                    getCategories()
                ]);
                setBookings(bookingsData);
                setCourses(coursesData);
                setCategories(categoriesData);
            } catch (error) {
                console.error("Failed to fetch booking data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // RESTORED: Full Filter and Sort Logic
    const filteredAndSortedBookings = useMemo(() => {
        return bookings
            .filter(booking => {
                const courseMatch = filterCourse === 'all' || booking.items.some(item => item.courseId === filterCourse);
                const categoryMatch = filterCategory === 'all' || booking.items.some(item => item.category === filterCategory);
                return courseMatch && categoryMatch;
            })
            .sort((a, b) => {
                const dateA = a.bookingDate instanceof Date ? a.bookingDate.getTime() : new Date((a.bookingDate as any).seconds * 1000).getTime();
                const dateB = b.bookingDate instanceof Date ? b.bookingDate.getTime() : new Date((b.bookingDate as any).seconds * 1000).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });
    }, [bookings, filterCourse, filterCategory, sortOrder]);

    // RESTORED: Full Date Formatting
    const formatDate = (date: { seconds: number; nanoseconds: number; } | Date) => {
        if (date instanceof Date) {
            return date.toLocaleString();
        }
        if ((date as any)?.seconds) {
            return new Date((date as any).seconds * 1000).toLocaleString();
        }
        return "Unknown Date";
    };

    if (isLoading) {
        return <div className="flex justify-center items-center"><LoadingSpinner /></div>;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">Bookings Management</h2>
            
            {/* RESTORED: Full Filter UI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Filter by Course</label>
                    <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                        <option value="all">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Filter by Category</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                        <option value="all">All Categories</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Sort by Date</label>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')} className="mt-1 block w-full p-2 border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 md:table">
                    <thead className="hidden md:table-header-group bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Booking Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sync</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 md:divide-none">
                        {filteredAndSortedBookings.length > 0 ? filteredAndSortedBookings.map(booking => (
                             <tr key={booking.id} className="block mb-4 p-4 border rounded-lg shadow-sm md:table-row md:p-0 md:border-none md:shadow-none md:mb-0">
                                <td data-label="Customer" className="block py-2 px-4 md:px-6 md:py-4 md:table-cell md:whitespace-nowrap text-right md:text-left border-b md:border-b-0 before:content-[attr(data-label)] before:font-bold before:float-left md:before:content-none">
                                    <div className="text-sm font-medium text-slate-900">{booking.customerFullName}</div>
                                    <div className="text-sm text-slate-500">{booking.customerEmail}</div>
                                    <div className="text-sm text-slate-500">{booking.customerPhone}</div>
                                </td>
                                <td data-label="Booking Details" className="block py-2 px-4 md:px-6 md:py-4 md:table-cell text-right md:text-left border-b md:border-b-0 before:content-[attr(data-label)] before:font-bold before:float-left md:before:content-none">
                                    <ul className="text-sm text-slate-700 list-disc list-inside space-y-1 text-right md:text-left">
                                        {booking.items.map((item, index) => (
                                            <li key={index}><strong>{item.quantity}x {item.courseName}</strong> on {item.sessionDate}</li>
                                        ))}
                                    </ul>
                                    <div className="text-xs text-slate-400 mt-2">Booked: {formatDate(booking.bookingDate)}</div>
                                </td>
                                <td data-label="Amount" className="block py-2 px-4 md:px-6 md:py-4 md:table-cell md:whitespace-nowrap text-right md:text-left border-b md:border-b-0 before:content-[attr(data-label)] before:font-bold before:float-left md:before:content-none">
                                    <span className="text-sm font-semibold text-slate-800">
                                        RM{booking.totalAmount.toFixed(2)}
                                    </span>
                                </td>
                                <td data-label="Status" className="block py-2 px-4 md:px-6 md:py-4 md:table-cell md:whitespace-nowrap text-right md:text-left before:content-[attr(data-label)] before:font-bold before:float-left md:before:content-none">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                                        booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {booking.paymentStatus}
                                    </span>
                                </td>
                                <td data-label="Action" className="block py-2 px-4 md:px-6 md:py-4 md:table-cell md:whitespace-nowrap text-right md:text-left before:content-[attr(data-label)] before:font-bold before:float-left md:before:content-none">
                                    {/* NEW: Automated Sync Button */}
                                    {booking.paymentStatus === 'pending' && (
                                        <button 
                                            onClick={() => handleManualSync(booking.id)}
                                            disabled={syncingId === booking.id}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded shadow transition disabled:bg-slate-400"
                                        >
                                            {syncingId === booking.id ? 'Syncing...' : 'Verify & Sync'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-slate-500">
                                    No bookings match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BookingsManagement;