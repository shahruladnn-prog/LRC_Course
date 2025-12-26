
import React, { useState, useEffect, ReactNode } from 'react';
import firebaseService from '../../services/firebase';
import LoadingSpinner from './LoadingSpinner';

interface FirebaseGuardProps {
  children: ReactNode;
}

const FirebaseGuard: React.FC<FirebaseGuardProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // The singleton instance handles initialization
        if (firebaseService.db) {
          setIsInitialized(true);
        } else {
          // This case is unlikely with the singleton pattern but is a good fallback
          console.error("Firebase DB not available");
        }
      } catch (error) {
        console.error("Firebase initialization failed:", error);
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Connecting to services...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default FirebaseGuard;
