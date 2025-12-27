import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course, Session, CartItem } from '../types';
import { getCourses, getSessionsForCourse } from '../services/firestoreService';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TermsModal from '../components/common/TermsModal';
import Logo from '../components/common/Logo';

const StorefrontHeader: React.FC = () => {
    const { items } = useCart();
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return (
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                 <Logo />
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link to="/cart" className="relative flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors duration-300">
                        {/* FIXED SVG: Corrected the path string that caused console errors */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4h-1.5" />
                        </svg>
                        <span className="hidden sm:inline">Cart</span>
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                                {totalItems}
                            </span>
                        )}
                    </Link>
                    <Link to="/admin/login" className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition duration-300 text-sm sm:text-base">
                        Admin
                    </Link>
                </div>
            </div>
        </header>
    );
}

const CourseBookingCard: React.FC<{ course: Course }> = ({ course }) => {
  const { items, addItem } = useCart();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isFullyBooked, setIsFullyBooked] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      const sessionsData = await getSessionsForCourse(course.id);
      
      const sortedSessions = sessionsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSessions(sortedSessions);

      const firstAvailable = sortedSessions.find(s => s.remainingSlots > 0);
      if (firstAvailable) {
        setSelectedSessionId(firstAvailable.id);
        setIsFullyBooked(false);
      } else {
        setSelectedSessionId(sortedSessions[0]?.id || null);
        setIsFullyBooked(sortedSessions.length > 0);
      }
      setIsLoadingSessions(false);
    };
    fetchSessions();
  }, [course.id]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSessionId]);

  const handleAgreeAndAddToCart = () => {
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    if (!selectedSession) return;

    const cartItem: CartItem = {
        cartId: `${course.id}-${selectedSession.id}`,
        courseId: course.id,
        courseName: course.name,
        sessionId: selectedSession.id,
        sessionDate: selectedSession.date,
        price: course.price,
        category: course.category,
        quantity: quantity,
    };
    addItem(cartItem);
    setIsTermsModalOpen(false);
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  
  // FIXED: Added missing logic to detect if item is in cart
  const isItemInCart = items.some(item => item.cartId === `${course.id}-${selectedSessionId}`);
  
  const existingCartItem = selectedSessionId ? items.find(item => item.cartId === `${course.id}-${selectedSessionId}`) : undefined;
  const availableSlotsForBooking = selectedSession ? selectedSession.remainingSlots - (existingCartItem?.quantity || 0) : 0;

  return (
    <>
    <div className={`bg-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col relative ${isFullyBooked && !isLoadingSessions ? 'opacity-50' : ''}`}>
        {isFullyBooked && !isLoadingSessions && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
                <span className="text-xl md:text-3xl font-extrabold text-red-600 bg-white px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-lg transform -rotate-12 border-4 border-red-600 border-dashed">
                    FULLY BOOKED
                </span>
            </div>
        )}
        <div className="flex-grow">
            <div className="mb-4">
                <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">{course.category}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{course.name}</h2>
            
            {course.importantHighlight && (
                <div className="my-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm flex items-start gap-2 rounded-md">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <span>{course.importantHighlight}</span>
                </div>
            )}
            
            <p className="text-indigo-600 font-semibold text-xl mb-4">RM{course.price.toFixed(2)}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Select a Date:</label>
                    {isLoadingSessions ? <div className="h-10 flex items-center"><LoadingSpinner /></div> : (
                        <select 
                            onChange={(e) => setSelectedSessionId(e.target.value)} 
                            value={selectedSessionId || ""}
                            className="block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                        >
                            {sessions.length === 0 && <option disabled>No sessions available</option>}
                            {sessions.map(session => (
                                <option key={session.id} value={session.id} disabled={session.remainingSlots <= 0}>
                                    {session.date} {session.remainingSlots <= 0 ? '(Full)' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                 <div className="space-y-2">
                    <label htmlFor={`quantity-${course.id}`} className="block text-sm font-medium text-slate-700">Quantity:</label>
                    <input
                        id={`quantity-${course.id}`}
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const maxSlots = availableSlotsForBooking;
                            const newQuantity = isNaN(val) ? 1 : Math.max(1, Math.min(val, maxSlots));
                            setQuantity(newQuantity);
                        }}
                        min="1"
                        max={availableSlotsForBooking > 0 ? availableSlotsForBooking : 1}
                        disabled={!selectedSession || availableSlotsForBooking <= 0}
                        className="block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                </div>
            </div>
            
            {selectedSession && (
                <p className={`text-sm font-medium text-center mb-4 p-2 rounded-md ${
                    selectedSession.remainingSlots > 5 ? 'bg-green-100 text-green-800' : 
                    selectedSession.remainingSlots > 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}`
                }>
                    {selectedSession.remainingSlots > 0
                      ? `${selectedSession.remainingSlots} slots remaining`
                      : 'Fully Booked'}
                </p>
            )}
        </div>
        
        <div className="mt-auto pt-4">
            <button 
                onClick={() => setIsTermsModalOpen(true)}
                disabled={!selectedSession || availableSlotsForBooking <= 0}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
                {/* FIXED: The ReferenceError occurred here because isItemInCart was missing */}
                {isItemInCart ? `Add ${quantity} More` : `Add ${quantity} to Cart`}
            </button>
        </div>
    </div>
    {isTermsModalOpen && (
        <TermsModal
            terms={course.termsAndConditions}
            isOpen={isTermsModalOpen}
            onClose={() => setIsTermsModalOpen(false)}
            onAgree={handleAgreeAndAddToCart}
        />
    )}
    </>
  );
};


const Storefront: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <StorefrontHeader />
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-xl shadow-sm mb-10">
                    <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl lg:text-5xl">
                            Unlock Your Potential
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                            Book your spot in one of our expert-led courses and take the next step in your professional journey.
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <>
                    {courses.length > 0 ? (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {courses.map(course => (
                               <CourseBookingCard key={course.id} course={course} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center bg-white p-12 rounded-xl shadow-md">
                            <h3 className="text-2xl font-bold text-slate-800">No Courses Available</h3>
                            <p className="text-slate-500 text-lg mt-2">No courses with available dates are currently scheduled. Please check back later!</p>
                        </div>
                    )}
                    </>
                )}
            </main>
             <footer className="text-center py-8 text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Lake Recreation Center Putrajaya. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default Storefront;