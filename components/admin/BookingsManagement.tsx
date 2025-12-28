import React, { useState, useEffect, useMemo } from 'react';
import { getBookings, getCourses, getCategories } from '../../services/firestoreService';
import { Booking, Course, Category } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { functions, db } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, deleteDoc } from 'firebase/firestore';
import BookingCreateModal from './BookingCreateModal';
import BookingEditModal from './BookingEditModal';
import BookingDetailsModal from './BookingDetailsModal';

const BookingsManagement: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    // Filters & Sorting
    const [filterCourse, setFilterCourse] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null); // For Details
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null); // For Editing

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

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredAndSortedBookings = useMemo(() => {
        let result = bookings.filter(booking => {
            // SAFEGUARD: Ensure items exists
            const items = booking.items || [];
            const courseMatch = filterCourse === 'all' || items.some(item => item.courseId === filterCourse);
            const categoryMatch = filterCategory === 'all' || items.some(item => item.category === filterCategory);
            return courseMatch && categoryMatch;
        });

        return result.sort((a, b) => {
            const getDate = (d: any) => {
                if (!d) return 0;
                if (d instanceof Date) return d.getTime();
                if (d.seconds) return d.seconds * 1000;
                return 0;
            };
            const dateA = getDate(a.bookingDate);
            const dateB = getDate(b.bookingDate);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [bookings, filterCourse, filterCategory, sortOrder]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredAndSortedBookings.length / itemsPerPage);
    const currentBookings = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedBookings.slice(start, start + itemsPerPage);
    }, [filteredAndSortedBookings, currentPage, itemsPerPage]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterCourse, filterCategory, sortOrder, itemsPerPage]);

    const handleManualSync = async (bookingId: string) => {
        setSyncingId(bookingId);
        try {
            const syncFn = httpsCallable(functions, 'syncToLoyverse');
            const result = await syncFn({ bookingId });
            const data = result.data as any;

            if (data.success) {
                alert("Synced successfully!");
                // OPTIMISTIC UPDATE: Update local state immediately
                setBookings(prev => prev.map(b =>
                    b.id === bookingId ? { ...b, syncStatus: 'synced' } : b
                ));
            } else {
                alert(`Sync failed: ${data.error}`);
            }
        } catch (error: any) {
            console.error("Manual sync failed:", error);
            alert(`Sync error: ${error.message}`);
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (bookingId: string) => {
        if (!window.confirm("Are you sure you want to delete this booking? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'bookings', bookingId));
            alert("Booking deleted.");
            fetchData();
        } catch (e) {
            console.error("Delete failed", e);
            alert("Failed to delete booking.");
        }
    };

    const handleExport = () => {
        const headers = ["Booking ID", "Bill Code", "Customer Name", "Email", "Phone", "Date", "Status", "Total Amount", "Items"];
        const rows = bookings.map(b => [
            b.id,
            (b as any).billcode || "",
            b.customerFullName || "N/A",
            b.customerEmail || "N/A",
            b.customerPhone || "N/A",
            formatDate(b.bookingDate),
            b.paymentStatus || "unknown",
            (b.totalAmount || 0).toFixed(2),
            (b.items || []).map(i => `${i.courseName} (${i.quantity})`).join("; ")
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bookings_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (date: { seconds: number; nanoseconds: number; } | Date) => {
        if (!date) return "N/A";
        if (date instanceof Date) return date.toLocaleDateString();
        // SAFEGUARD: Check if seconds exists
        if ((date as any)?.seconds) return new Date((date as any).seconds * 1000).toLocaleDateString();
        return "N/A";
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
                    <p className="text-sm text-slate-500">Manage payment and sync status</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleExport} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg font-medium text-sm transition">
                        Export CSV
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm">
                        + New Booking
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Categories</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')} className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
                <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="w-full text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value={10}>Show 10</option>
                    <option value={20}>Show 20</option>
                    <option value={50}>Show 50</option>
                </select>
            </div>

            {/* Table / List */}
            <div className="flex-1 overflow-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="min-w-full divide-y divide-slate-200 w-full text-sm">
                    <thead className="hidden md:table-header-group bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-center font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center font-medium text-slate-500 uppercase tracking-wider">Sync</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {currentBookings.length > 0 ? currentBookings.map(booking => (
                            <tr
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                className="group hover:bg-slate-50 transition cursor-pointer md:table-row block my-2 md:my-0 border rounded-lg md:border-none shadow-sm md:shadow-none bg-white p-3"
                            >
                                {/* Mobile-Optimized Grid for each Card */}
                                <td className="block md:table-cell py-2 px-1 md:px-6">
                                    <div className="flex justify-between items-start md:block">
                                        <div>
                                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">{booking.customerFullName || 'Unknown Customer'}</div>
                                            <div className="text-xs text-slate-500">{booking.customerEmail || 'No Email'}</div>
                                        </div>
                                        <div className="md:hidden text-right">
                                            <span className="font-bold text-slate-900">RM{(booking.totalAmount || 0).toFixed(2)}</span>
                                            <div className="text-xs text-slate-400 mt-1">{formatDate(booking.bookingDate)}</div>
                                        </div>
                                    </div>
                                </td>

                                <td className="block md:table-cell py-2 px-1 md:px-6 mt-2 md:mt-0">
                                    <div className="flex justify-between items-center md:block">
                                        <span className="text-xs text-slate-600 line-clamp-1">{(booking.items || []).map(i => i ? `${i.quantity || 1}x ${i.courseName || 'Unknown'}` : '').join(', ')}</span>
                                        {/* Mobile hidden date */}
                                        <span className="hidden md:block text-xs text-slate-400 mt-1">{formatDate(booking.bookingDate)}</span>
                                    </div>
                                </td>

                                <td className="hidden md:table-cell px-6 py-4 text-right font-mono text-slate-700">
                                    RM{(booking.totalAmount || 0).toFixed(2)}
                                </td>

                                <td className="block md:table-cell py-2 px-1 md:px-6 mt-2 md:mt-0 border-t md:border-none pt-2 md:pt-0">
                                    <div className="flex justify-between items-center md:public">
                                        <span className="md:hidden text-xs font-bold text-slate-500 uppercase">Status</span>
                                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full items-center gap-1 ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                            booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${booking.paymentStatus === 'paid' ? 'bg-green-500' :
                                                booking.paymentStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></span>
                                            {(booking.paymentStatus || 'unknown').toUpperCase()}
                                        </span>
                                    </div>
                                </td>

                                <td className="block md:table-cell py-2 px-1 md:px-6 mt-1 md:mt-0">
                                    <div className="flex justify-between items-center md:justify-center">
                                        <span className="md:hidden text-xs font-bold text-slate-500 uppercase">Loyverse</span>
                                        {booking.paymentStatus === 'paid' ? (
                                            booking.syncStatus === 'synced' ? (
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Synced</span>
                                            ) : booking.syncStatus === 'failed' ? (
                                                <div className="flex flex-col items-end md:items-start">
                                                    <span className="text-xs font-bold text-red-600 mb-1">⚠ Failed</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleManualSync(booking.id); }}
                                                        disabled={syncingId === booking.id}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 underline disabled:text-slate-400"
                                                    >
                                                        {syncingId === booking.id ? 'Retrying...' : 'Retry Sync'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end md:items-start">
                                                    <span className="text-xs text-slate-500 mb-1">Pending Sync</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleManualSync(booking.id); }}
                                                        disabled={syncingId === booking.id}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 underline disabled:text-slate-400"
                                                    >
                                                        {syncingId === booking.id ? 'Syncing...' : 'Sync Now'}
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-xs text-slate-300">-</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-400">
                                    No bookings found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-auto">
                <span className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredAndSortedBookings.length)}</span> of <span className="font-semibold text-slate-900">{filteredAndSortedBookings.length}</span> results
                </span>
                <div className="flex gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                        Previous
                    </button>
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Logic to show generic page numbers if too many
                            const p = i + 1;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 flex items-center justify-center text-sm rounded transition ${currentPage === p ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Modals */}
            <BookingCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
            />

            {editingBooking && (
                <BookingEditModal
                    isOpen={!!editingBooking}
                    booking={editingBooking}
                    onClose={() => setEditingBooking(null)}
                    onSuccess={fetchData}
                />
            )}

            <BookingDetailsModal
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onUpdate={fetchData} // Refresh whenever changes happen in modal
            />
        </div>
    );
};

export default BookingsManagement;