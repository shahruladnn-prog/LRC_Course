
import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { BookingItem } from '../types';
import Logo from '../components/common/Logo';

interface ConfirmationState {
    customerFullName: string;
    totalAmount: number;
    items: BookingItem[];
}

const OrderConfirmationPage: React.FC = () => {
    const location = useLocation();
    const state = location.state as ConfirmationState | null;

    if (!state) {
        // Redirect to home if the page is accessed directly without state
        return <Navigate to="/" />;
    }

    const { customerFullName, totalAmount, items } = state;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <main className="max-w-2xl w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl text-center">
                 <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Thank You, {customerFullName}!</h1>
                <p className="text-slate-600 mt-2">Your booking has been confirmed.</p>
                <p className="text-slate-600">A confirmation email has been sent to your address.</p>

                <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6 my-8">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Booking Summary</h2>
                    <ul className="divide-y divide-slate-200">
                        {items.map((item, index) => (
                            <li key={index} className="py-3 flex justify-between items-start">
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-800">{item.courseName}</p>
                                    <p className="text-sm text-slate-500">Date: {item.sessionDate}</p>
                                    <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                     <p className="font-semibold text-slate-800">RM{(item.price * item.quantity).toFixed(2)}</p>
                                     {item.quantity > 1 && <p className="text-xs text-slate-500">(RM{item.price.toFixed(2)} each)</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between font-bold text-lg text-slate-900">
                        <span>Total Paid:</span>
                        <span>RM{totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <Link 
                    to="/" 
                    className="inline-block w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 ease-in-out hover:bg-indigo-700 shadow-md hover:shadow-lg"
                >
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default OrderConfirmationPage;
