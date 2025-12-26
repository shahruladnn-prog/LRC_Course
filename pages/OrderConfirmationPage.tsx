import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../services/firebase'; // Ensure this path is correct based on image_ce419c.png
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const ConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const checkStatus = async () => {
      if (!bookingId) {
        setStatus('error');
        return;
      }
      try {
        const docRef = doc(db, 'bookings', bookingId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().paymentStatus === 'paid') {
          setStatus('success');
        } else {
          // Retry logic to allow for webhook processing time
          setTimeout(async () => {
            const retrySnap = await getDoc(docRef);
            if (retrySnap.exists() && retrySnap.data().paymentStatus === 'paid') {
              setStatus('success');
            } else { setStatus('error'); }
          }, 4000);
        }
      } catch (err) { setStatus('error'); }
    };
    checkStatus();
  }, [bookingId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <><Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" /><h2 className="text-2xl font-bold">Verifying Payment...</h2></>
        )}
        {status === 'success' && (
          <><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900">Success!</h2>
          <p className="mt-2 text-gray-600">Your class is booked.</p>
          <Link to="/" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-md">Home</Link></>
        )}
        {status === 'error' && (
          <><XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900">Payment Pending</h2>
          <p className="mt-2 text-gray-600">We are still waiting for confirmation. Please refresh in a minute.</p>
          <Link to="/" className="mt-6 inline-block bg-gray-600 text-white px-6 py-2 rounded-md">Home</Link></>
        )}
      </div>
    </div>
  );
};
export default ConfirmationPage;