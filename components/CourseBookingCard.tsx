import React, { useState, useEffect } from 'react';
import { Course, Session, CartItem } from '../types';
import { getSessionsForCourse } from '../services/firestoreService';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from './common/LoadingSpinner';
import TermsModal from './common/TermsModal';

interface CourseBookingCardProps {
    course: Course;
}

const CourseBookingCard: React.FC<CourseBookingCardProps> = ({ course }) => {
    const { items, addItem } = useCart();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    // State to handle visual "booking" status
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
                setIsFullyBooked(sortedSessions.length > 0 && sortedSessions.every(s => s.remainingSlots <= 0));
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
    const isItemInCart = items.some(item => item.cartId === `${course.id}-${selectedSessionId}`);

    // Calculate slots taking cart into account
    const existingCartItem = selectedSessionId ? items.find(item => item.cartId === `${course.id}-${selectedSessionId}`) : undefined;
    const availableSlotsForBooking = selectedSession ? selectedSession.remainingSlots - (existingCartItem?.quantity || 0) : 0;

    return (
        <>
            <div className={`group bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 ring-1 ring-slate-900/5 ${isFullyBooked && !isLoadingSessions ? 'opacity-80 grayscale-[0.5]' : ''}`}>

                {/* Fully Booked Overlay */}
                {isFullyBooked && !isLoadingSessions && (
                    <div className="absolute inset-0 bg-slate-900/40 z-10 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/95 text-red-600 px-6 py-2 rounded-lg font-bold text-xl shadow-2xl transform -rotate-6 border-2 border-red-500">
                            SOLD OUT
                        </div>
                    </div>
                )}

                {/* Category & Price Header */}
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                            {course.category}
                        </span>
                        <div className="text-right">
                            <span className="block text-2xl font-extrabold text-slate-900">RM{course.price.toFixed(0)}</span>
                            <span className="text-xs text-slate-400 font-medium">per person</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors mb-2">
                        {course.name}
                    </h2>
                    {course.importantHighlight && (
                        <div className="mt-3 text-xs bg-amber-50 text-amber-800 px-3 py-2 rounded-lg border border-amber-100 flex gap-2">
                            <span className="font-bold shrink-0">Note:</span> {course.importantHighlight}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="px-6 py-2 flex-grow space-y-4">
                    {/* Session Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Date</label>
                        <div className="relative">
                            {isLoadingSessions ? (
                                <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg"></div>
                            ) : (
                                <select
                                    className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                                    onChange={(e) => setSelectedSessionId(e.target.value)}
                                    value={selectedSessionId || ""}
                                >
                                    {sessions.length === 0 ? <option disabled>No dates available</option> : null}
                                    {sessions.map(session => (
                                        <option key={session.id} value={session.id} disabled={session.remainingSlots <= 0}>
                                            {session.date} {session.remainingSlots <= 0 ? '(Full)' : `(${session.remainingSlots} slots)`}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    {selectedSession && availableSlotsForBooking > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passengers / Slots</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition"
                                >-</button>
                                <input
                                    type="number"
                                    min="1"
                                    max={availableSlotsForBooking}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.min(availableSlotsForBooking, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="flex-1 text-center font-bold text-slate-800 border-none bg-slate-50 rounded-lg focus:ring-0 h-10"
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(availableSlotsForBooking, quantity + 1))}
                                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition"
                                >+</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-4 mt-auto">
                    {/* Availability Status Text */}
                    {selectedSession && (
                        <div className={`mb-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 
                            ${availableSlotsForBooking > 0
                                ? 'text-emerald-600'
                                : 'text-red-500'}`}>

                            {availableSlotsForBooking > 0 ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    {availableSlotsForBooking} slots available
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Session Full
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => setIsTermsModalOpen(true)}
                        disabled={!selectedSession || availableSlotsForBooking <= 0}
                        className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-200 transition-all duration-300 hover:bg-indigo-600 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isItemInCart ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Update Cart ({quantity})
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                </svg>
                                Add to Cart
                            </>
                        )}
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

export default CourseBookingCard;
