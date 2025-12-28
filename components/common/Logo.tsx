import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string; // Allow passing styles
}

const Logo: React.FC<LogoProps> = ({ className = "h-12 w-auto" }) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <Link to="/" aria-label="Back to homepage" className={`flex items-center focus:outline-none ${className}`}>
      {!imgError ? (
        <img
          src="/assets/logo.png"
          alt="Putrajaya Lake Recreation Center"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`flex items-center justify-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 ${className.includes('h-') ? 'text-2xl' : 'text-xl'}`}>
          LRC<span className="text-slate-700">Putrajaya</span>
        </div>
      )}
    </Link>
  );
};

export default Logo;
