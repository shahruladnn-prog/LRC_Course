import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { getCourses } from '../services/firestoreService';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Logo from '../components/common/Logo';
import CourseBookingCard from '../components/CourseBookingCard';

const StorefrontHeader: React.FC = () => {
    const { items } = useCart();
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <Logo className="h-10 w-auto" />
                <div className="flex items-center gap-3">
                    <Link to="/cart" className={`relative flex items-center gap-2 font-medium px-4 py-2 rounded-full transition-all ${scrolled ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4h-1.5" />
                        </svg>
                        <span className="hidden sm:inline">Cart</span>
                        {totalItems > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                                {totalItems}
                            </span>
                        )}
                    </Link>
                    <Link to="/admin/login" className={`font-bold px-4 py-2 rounded-full transition-all text-sm ${scrolled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg'}`}>
                        Admin
                    </Link>
                </div>
            </div>
        </header>
    );
}

const Storefront: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [sortOption, setSortOption] = useState<string>('name-asc');

    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoading(true);
            try {
                const allCourses = await getCourses();
                const visibleCourses = allCourses.filter(course => !course.isHidden);
                setCourses(visibleCourses);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, []);

    // Extract unique categories
    const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))].sort();

    // Filter and Sort Logic
    const filteredCourses = courses
        .filter(course => selectedCategory === 'All' || course.category === selectedCategory)
        .sort((a, b) => {
            if (sortOption === 'price-asc') return a.price - b.price;
            if (sortOption === 'price-desc') return b.price - a.price;
            if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
            return 0;
        });

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <StorefrontHeader />

            {/* Hero Section */}
            <div className="relative bg-indigo-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40 text-center z-10">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-sm">
                        Discover Your Next Adventure
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg sm:text-xl text-indigo-100 leading-relaxed max-w-3xl">
                        Join expert-led sessions at the Putrajaya Lake Recreation Center. Enhance your skills, meet new people, and enjoy the outdoors.
                    </p>
                </div>

                {/* Decorative curve */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-slate-50 fill-current block align-bottom h-16 sm:h-24">
                        <path d="M0 0l48 8.875C96 17.75 192 35.5 288 44.375 384 53.25 480 53.25 576 44.375 672 35.5 768 17.75 864 8.875 960 0 1056 0 1152 8.875 1248 17.75 1344 35.5 1392 44.375L1440 53.25V120H0V0z" />
                    </svg>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-20">
                {/* Filter & Search Bar */}
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-12 border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6 sticky top-24 z-30 transition-shadow hover:shadow-2xl">
                    <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 no-scrollbar items-center">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mr-2">Filters:</span>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 transform scale-105'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase px-2">Sort</span>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-transparent text-slate-700 text-sm font-medium focus:ring-0 border-none p-0 pr-8 cursor-pointer"
                        >
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="price-asc">Price (Low to High)</option>
                            <option value="price-desc">Price (High to Low)</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-32">
                        <LoadingSpinner />
                        <p className="mt-4 text-slate-500 animate-pulse">Loading courses...</p>
                    </div>
                ) : (
                    <>
                        {filteredCourses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                                {filteredCourses.map(course => (
                                    <CourseBookingCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-slate-300">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-6 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">No Courses Found</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    We couldn't find any courses matching your current filters. Try selecting a different category or clearing your filters.
                                </p>
                                <button
                                    onClick={() => { setSelectedCategory('All'); setSortOption('name-asc'); }}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 transition-all"
                                >
                                    View All Courses
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="bg-white border-t border-slate-100 py-12 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Logo className="h-8 opacity-70 grayscale hover:grayscale-0 transition-all" />
                        <span className="text-slate-400 text-sm">© {new Date().getFullYear()} LRC Putrajaya</span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <Link to="/privacy" className="hover:text-indigo-600 transition">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-indigo-600 transition">Terms of Service</Link>
                        <Link to="/contact" className="hover:text-indigo-600 transition">Contact Us</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Storefront;