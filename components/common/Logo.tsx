
import React from 'react';
import { Link } from 'react-router-dom';

const Logo: React.FC = () => {
  return (
    <Link to="/" aria-label="Back to homepage" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg p-1 -m-1">
      <div className="p-2 bg-slate-800 rounded-lg shadow-md group-hover:bg-indigo-600 transition-colors">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13.5C3 13.5 4.5 11.5 7 11.5C9.5 11.5 11.5 15.5 14 15.5C16.5 15.5 18 13.5 19 12.5" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 18.5C3 18.5 4.5 16.5 7 16.5C9.5 16.5 11.5 20.5 14 20.5C16.5 20.5 18 18.5 19 17.5" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 3L21 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 5L19 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 7L17 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
        LRC Course
      </span>
    </Link>
  );
};

export default Logo;
