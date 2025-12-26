
import React, { useState, useRef, UIEvent, useEffect } from 'react';

interface TermsModalProps {
  terms: string;
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ terms, isOpen, onClose, onAgree }) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When the modal opens, check if scrolling is necessary.
    if (isOpen) {
      // Reset state for when the modal is re-opened
      setHasScrolledToEnd(false);
      setIsAgreed(false);

      // Use a timeout to allow the browser to render and calculate dimensions
      setTimeout(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) {
          const isScrollable = scrollElement.scrollHeight > scrollElement.clientHeight;
          // If it's not scrollable, the user can agree immediately.
          if (!isScrollable) {
            setHasScrolledToEnd(true);
          }
        }
      }, 100);
    }
  }, [isOpen]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (hasScrolledToEnd) return; // Don't re-run if already at the end
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // Check if user has scrolled to the bottom (with a small tolerance)
    if (scrollHeight - scrollTop <= clientHeight + 5) {
      setHasScrolledToEnd(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <h2 className="text-2xl font-bold mb-4 text-slate-900 flex-shrink-0">Terms & Conditions</h2>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-grow overflow-y-auto border border-slate-200 bg-slate-50 p-4 rounded-md text-sm text-slate-700"
        >
          <p className="whitespace-pre-wrap">{terms}</p>
        </div>
        <div className="mt-4 flex-shrink-0">
          <label className={`flex items-center space-x-3 cursor-pointer transition-colors ${!hasScrolledToEnd ? 'text-slate-400' : 'text-slate-700'}`}>
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={e => setIsAgreed(e.target.checked)}
              disabled={!hasScrolledToEnd}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded disabled:cursor-not-allowed"
            />
            <span className={`text-sm font-medium ${!hasScrolledToEnd ? 'text-slate-400' : 'text-slate-700'}`}>
                {hasScrolledToEnd ? 'I agree to the terms and conditions' : 'Please scroll to the end to agree'}
            </span>
          </label>
        </div>
        <div className="flex justify-end space-x-4 pt-4 mt-4 border-t border-slate-200 flex-shrink-0">
          <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={onAgree}
            disabled={!isAgreed}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            Agree & Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
