
import React, { useState } from 'react';
import { Course, Category } from '../../types';
import CourseForm from './CourseForm';
import ConfirmationModal from '../common/ConfirmationModal';

const LoyverseLinkIcon: React.FC<{ linked: boolean }> = ({ linked }) => (
    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${linked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`} title={linked ? 'This course is linked to Loyverse via its SKU.' : 'SKU missing. This course is not linked to Loyverse.'}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        <span>{linked ? 'Linked' : 'Not Linked'}</span>
    </div>
);

interface CourseManagerProps {
    courses: Course[];
    categories: Category[];
    onCourseSave: (course: Omit<Course, 'id'> | Course) => Promise<void>;
    onCourseDelete: (courseId: string) => Promise<void>;
}

const CourseManager: React.FC<CourseManagerProps> = ({ courses, categories, onCourseSave, onCourseDelete }) => {
    const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isSavingCourse, setIsSavingCourse] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);


    const openEditForm = (course: Course) => {
        setEditingCourse(course);
        setIsCourseFormOpen(true);
    };

    const openNewForm = () => {
        setEditingCourse(null);
        setIsCourseFormOpen(true);
    };
    
    const handleCourseSave = async (courseData: Omit<Course, 'id'> | Course) => {
        setIsSavingCourse(true);
        await onCourseSave(courseData);
        setIsSavingCourse(false);
        setIsCourseFormOpen(false);
        setEditingCourse(null);
    };

    const handleDeleteClick = (courseId: string) => {
        setCourseToDelete(courseId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (courseToDelete) {
            setIsDeleting(courseToDelete);
            await onCourseDelete(courseToDelete);
            setIsDeleting(null);
            setCourseToDelete(null);
            setIsConfirmModalOpen(false);
        }
    };

    const handleCancelDelete = () => {
        setCourseToDelete(null);
        setIsConfirmModalOpen(false);
    };


    return (
        <div>
             <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Your Courses</h2>
                <button onClick={openNewForm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add New Course
                </button>
            </div>

            {isCourseFormOpen && (
                <CourseForm 
                    course={editingCourse} 
                    categories={categories}
                    onSave={handleCourseSave} 
                    onCancel={() => { setIsCourseFormOpen(false); setEditingCourse(null); }}
                    isSaving={isSavingCourse}
                />
            )}

             <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Course"
                message={
                    <>
                        Are you sure you want to delete this course and all its associated slots? 
                        <br />
                        <span className="font-semibold text-red-700">This action cannot be undone.</span>
                    </>
                }
                confirmText="Delete"
                isConfirming={!!isDeleting}
            />

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.length > 0 ? courses.map(course => (
                        <div key={course.id} className={`bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col transition-opacity ${course.isHidden ? 'opacity-60' : ''}`}>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                   <h3 className="text-xl font-bold text-slate-900 leading-tight">{course.name}</h3>
                                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                        <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{course.category}</span>
                                        {course.isHidden && <span className="inline-block bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Hidden</span>}
                                    </div>
                                </div>
                                 <div className="flex justify-between items-center mb-3">
                                    <p className="text-slate-700 font-semibold">RM{course.price.toFixed(2)}</p>
                                    <LoyverseLinkIcon linked={!!course.sku} />
                                 </div>
                                <p className="text-xs text-slate-500 font-mono bg-slate-200 px-2 py-1 rounded">SKU: {course.sku || 'N/A'}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
                                 <button onClick={() => openEditForm(course)} className="flex-1 text-center bg-white hover:bg-slate-100 text-indigo-600 font-bold py-2 px-4 rounded-md transition duration-300 border border-indigo-600">
                                     Edit
                                 </button>
                                  <button 
                                    onClick={() => handleDeleteClick(course.id)} 
                                    disabled={isDeleting === course.id}
                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition duration-300 disabled:opacity-50"
                                    aria-label="Delete course"
                                >
                                    {isDeleting === course.id ? (
                                        <svg className="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center py-10">
                            <p className="text-slate-500">No courses found. Click "Add New Course" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseManager;