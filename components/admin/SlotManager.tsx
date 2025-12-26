
import React, { useState, useEffect } from 'react';
import { Course, Session } from '../../types';
import SessionForm from './SessionForm';
import ConfirmationModal from '../common/ConfirmationModal';

interface SlotManagerProps {
    courses: Course[];
    sessions: Record<string, Session[]>;
    onSessionSave: (session: Omit<Session, 'id'>) => Promise<void>;
    onSessionUpdate: (sessionId: string, courseId: string, data: Partial<Session>) => Promise<void>;
    onSessionDelete: (sessionId: string, courseId: string) => Promise<void>;
}

const SlotManager: React.FC<SlotManagerProps> = ({ courses, sessions, onSessionSave, onSessionUpdate, onSessionDelete }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id || null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editingDate, setEditingDate] = useState('');
    const [editingTotalSlots, setEditingTotalSlots] = useState(0);
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<{ sessionId: string; courseId: string; } | null>(null);


    useEffect(() => {
        if (courses.length > 0 && !courses.find(c => c.id === selectedCourseId)) {
            setSelectedCourseId(courses[0].id);
        } else if (courses.length === 0) {
            setSelectedCourseId(null);
        }
    }, [courses, selectedCourseId]);

    const handleEditClick = (session: Session) => {
        setEditingSession(session);
        setEditingDate(session.date);
        setEditingTotalSlots(session.totalSlots);
    };

    const handleCancelEdit = () => {
        setEditingSession(null);
    };

    const handleSaveEdit = async () => {
        if (!editingSession) return;
        setIsSaving(true);
        const bookedSlots = editingSession.totalSlots - editingSession.remainingSlots;
        if (editingTotalSlots < bookedSlots) {
            alert(`Total slots cannot be less than the number of booked slots (${bookedSlots}).`);
            setIsSaving(false);
            return;
        }

        const newRemainingSlots = editingSession.remainingSlots + (editingTotalSlots - editingSession.totalSlots);

        await onSessionUpdate(editingSession.id, editingSession.courseId, {
            date: editingDate,
            totalSlots: editingTotalSlots,
            remainingSlots: newRemainingSlots,
        });
        setIsSaving(false);
        setEditingSession(null);
    };

    const handleDeleteClick = (sessionId: string, courseId: string) => {
        setSessionToDelete({ sessionId, courseId });
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (sessionToDelete) {
            setDeletingSessionId(sessionToDelete.sessionId);
            await onSessionDelete(sessionToDelete.sessionId, sessionToDelete.courseId);
            setDeletingSessionId(null);
            setIsConfirmModalOpen(false);
            setSessionToDelete(null);
        }
    };
    
    const handleCancelDelete = () => {
        setIsConfirmModalOpen(false);
        setSessionToDelete(null);
    };

    const handleSessionSave = async (sessionData: Omit<Session, 'id'>) => {
        setIsSaving(true);
        await onSessionSave(sessionData);
        setIsSaving(false);
    };

    const selectedCourseSessions = selectedCourseId ? sessions[selectedCourseId] || [] : [];

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Slot Management</h2>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Slot"
                message="Are you sure you want to delete this slot? This action cannot be undone."
                confirmText="Delete"
                isConfirming={!!deletingSessionId}
            />

            {courses.length > 0 ? (
                <div>
                    <label htmlFor="course-select" className="block text-sm font-medium text-slate-700 mb-1">Select Course</label>
                    <select
                        id="course-select"
                        value={selectedCourseId || ''}
                        onChange={(e) => { setSelectedCourseId(e.target.value); handleCancelEdit(); }}
                        className="block w-full max-w-md px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                    </select>

                    {selectedCourseId && (
                        <div className="mt-6">
                             <div className="border border-slate-200 rounded-lg">
                                <div className="p-4">
                                     <h3 className="text-lg font-semibold text-slate-700">
                                        Available Slots for "{courses.find(c => c.id === selectedCourseId)?.name}"
                                    </h3>
                                </div>
                                {selectedCourseSessions.length > 0 ? (
                                    <ul className="divide-y divide-slate-200">
                                        <li className="hidden sm:grid grid-cols-3 items-center gap-4 px-4 py-2 font-semibold text-sm text-slate-600 bg-slate-50">
                                            <div className="col-span-1">Date</div>
                                            <div className="col-span-1">Slots (Remaining / Total)</div>
                                            <div className="col-span-1 text-right">Actions</div>
                                        </li>
                                        {selectedCourseSessions.map(session => (
                                            <li key={session.id} className="block sm:grid sm:grid-cols-3 items-center gap-4 px-4 py-3">
                                                <div className="sm:col-span-1 mb-2 sm:mb-0">
                                                    <span className="font-medium text-slate-600 sm:hidden">Date: </span>
                                                    {editingSession?.id === session.id ? (
                                                        <input type="date" value={editingDate} onChange={e => setEditingDate(e.target.value)} className="w-full sm:w-auto border-slate-300 rounded-md shadow-sm text-sm bg-white text-slate-900" />
                                                    ) : (
                                                        <span className="font-medium text-slate-900">{session.date}</span>
                                                    )}
                                                </div>
                                                
                                                <div className="sm:col-span-1 mb-2 sm:mb-0">
                                                    <span className="font-medium text-slate-600 sm:hidden">Slots: </span>
                                                    {editingSession?.id === session.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" value={editingTotalSlots} onChange={e => setEditingTotalSlots(Number(e.target.value))} className="w-24 border-slate-300 rounded-md shadow-sm text-sm bg-white text-slate-900" />
                                                            <span className="text-sm text-slate-600">total</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-500">
                                                            <span className="font-semibold text-slate-800">{session.remainingSlots}</span> / {session.totalSlots} slots
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="sm:col-span-1 flex justify-start sm:justify-end items-center gap-2 mt-2 sm:mt-0">
                                                    {editingSession?.id === session.id ? (
                                                        <>
                                                            <button onClick={handleSaveEdit} disabled={isSaving} className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-green-400">{isSaving ? 'Saving...' : 'Save'}</button>
                                                            <button onClick={handleCancelEdit} className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-md">Cancel</button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={() => handleEditClick(session)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                                            <button onClick={() => handleDeleteClick(session.id, session.courseId)} className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-red-400" disabled={deletingSessionId === session.id}>
                                                                {deletingSessionId === session.id ? 'Deleting...' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="px-4 pb-4 text-slate-500">No slots have been added for this course yet.</p>
                                )}
                            </div>

                            <SessionForm 
                                courseId={selectedCourseId}
                                onSave={handleSessionSave}
                                isSaving={isSaving}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-slate-500">You must add a course before you can manage slots.</p>
            )}
        </div>
    );
};

export default SlotManager;