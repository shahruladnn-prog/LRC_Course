
import React, { useState, FormEvent } from 'react';
import { Session } from '../../types';

interface SessionFormProps {
  courseId: string;
  onSave: (session: Omit<Session, 'id'>) => void;
  isSaving: boolean;
}

const SessionForm: React.FC<SessionFormProps> = ({ courseId, onSave, isSaving }) => {
  const [date, setDate] = useState('');
  const [totalSlots, setTotalSlots] = useState(10);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date || totalSlots <= 0) {
        alert("Please provide a valid date and number of slots.");
        return;
    }
    onSave({ courseId, date, totalSlots, remainingSlots: totalSlots });
    setDate('');
    setTotalSlots(10);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-200 pt-4">
        <h4 className="font-semibold text-md text-slate-800 mb-2">Add New Slot</h4>
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-grow">
                <label htmlFor={`date-${courseId}`} className="block text-sm font-medium text-slate-700">Date</label>
                <input id={`date-${courseId}`} type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"/>
            </div>
            <div className="w-full sm:w-auto">
                <label htmlFor={`slots-${courseId}`} className="block text-sm font-medium text-slate-700">Total Slots</label>
                <input id={`slots-${courseId}`} type="number" value={totalSlots} onChange={e => setTotalSlots(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"/>
            </div>
            <button 
              type="submit" 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md text-sm w-full sm:w-auto disabled:bg-blue-300"
              disabled={isSaving}
            >
              {isSaving ? 'Adding...' : 'Add Slot'}
            </button>
        </div>
    </form>
  );
};

export default SessionForm;