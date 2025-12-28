
import React, { useState, useEffect, useCallback } from 'react';
import { Course, Session, Category } from '../types';
import { getCourses, getSessionsForCourse, addCourse, updateCourse, deleteCourse, addSession, updateSession, deleteSession, getCategories, addCategory, updateCategory, deleteCategory } from '../services/firestoreService';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CourseManager from '../components/admin/CourseManager';
import SlotManager from '../components/admin/SlotManager';
import CategoryManager from '../components/admin/CategoryManager';
import BookingsManagement from '../components/admin/BookingsManagement';
import ContentManager from '../components/admin/ContentManager';
import Logo from '../components/common/Logo';
import ErrorBoundary from '../components/common/ErrorBoundary';

type AdminView = 'courses' | 'slots' | 'categories' | 'bookings' | 'settings';

const NavButton: React.FC<{
    label: string;
    view: AdminView;
    activeView: AdminView;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, view, activeView, onClick, children }) => (
    <li>
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-md font-medium transition-colors flex items-center gap-3 ${activeView === view
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
        >
            {children}
            {label}
        </button>
    </li>
);

const AdminDashboard: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<Record<string, Session[]>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<AdminView>('courses');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [coursesData, categoriesData] = await Promise.all([getCourses(), getCategories()]);
            setCourses(coursesData);
            setCategories(categoriesData);

            const sessionsData: Record<string, Session[]> = {};
            for (const course of coursesData) {
                sessionsData[course.id] = await getSessionsForCourse(course.id);
            }
            setSessions(sessionsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/admin/login');
    };

    const handleViewChange = (view: AdminView) => {
        setActiveView(view);
        setIsSidebarOpen(false); // Close sidebar on navigation
    }

    const handleCourseSave = async (course: Omit<Course, 'id'> | Course) => {
        if ('id' in course) {
            await updateCourse(course.id, course);
        } else {
            await addCourse(course);
        }
        await fetchAllData();
    };

    const handleCourseDelete = async (courseId: string) => {
        await deleteCourse(courseId);
        await fetchAllData();
    };

    const handleSessionSave = async (session: Omit<Session, 'id'>) => {
        await addSession(session);
        const updatedSessions = await getSessionsForCourse(session.courseId);
        setSessions(prev => ({ ...prev, [session.courseId]: updatedSessions }));
    };

    const handleSessionUpdate = async (sessionId: string, courseId: string, sessionData: Partial<Session>) => {
        await updateSession(sessionId, sessionData);
        const updatedSessions = await getSessionsForCourse(courseId);
        setSessions(prev => ({ ...prev, [courseId]: updatedSessions }));
    };

    const handleSessionDelete = async (sessionId: string, courseId: string) => {
        await deleteSession(sessionId);
        const updatedSessions = await getSessionsForCourse(courseId);
        setSessions(prev => ({ ...prev, [courseId]: updatedSessions }));
    };

    const handleCategoryAdd = async (category: Omit<Category, 'id'>) => {
        await addCategory(category);
        const updatedCategories = await getCategories();
        setCategories(updatedCategories);
    };

    const handleCategoryUpdate = async (categoryId: string, categoryData: Partial<Category>) => {
        await updateCategory(categoryId, categoryData);
        const updatedCategories = await getCategories();
        setCategories(updatedCategories);
    };

    const handleCategoryDelete = async (categoryId: string) => {
        await deleteCategory(categoryId);
        const updatedCategories = await getCategories();
        setCategories(updatedCategories);
    };

    return (
        <div className="relative min-h-screen md:flex bg-slate-50 text-slate-900">
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            <aside className={`fixed inset-y-0 left-0 w-64 bg-white text-slate-800 border-r border-slate-200 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
                <div className="p-4 border-b border-slate-200">
                    <Logo />
                </div>
                <nav className="p-2 flex-grow">
                    <ul className="space-y-1">
                        <NavButton label="Courses" view="courses" activeView={activeView} onClick={() => handleViewChange('courses')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-9-5.747h18" /></svg>
                        </NavButton>
                        <NavButton label="Slots" view="slots" activeView={activeView} onClick={() => handleViewChange('slots')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </NavButton>
                        <NavButton label="Categories" view="categories" activeView={activeView} onClick={() => handleViewChange('categories')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </NavButton>
                        <NavButton label="Bookings" view="bookings" activeView={activeView} onClick={() => handleViewChange('bookings')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        </NavButton>
                        <NavButton label="Settings" view="settings" activeView={activeView} onClick={() => handleViewChange('settings')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </NavButton>
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white border-b border-slate-200">
                    <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsSidebarOpen(true)}>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 capitalize">{activeView.replace('-', ' ')}</h1>
                    <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 shadow-sm">
                        Sign Out
                    </button>
                </header>
                <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
                    ) : (
                        <>
                            {activeView === 'courses' && (
                                <CourseManager
                                    courses={courses}
                                    categories={categories}
                                    onCourseSave={handleCourseSave}
                                    onCourseDelete={handleCourseDelete}
                                />
                            )}
                            {activeView === 'slots' && (
                                <SlotManager
                                    courses={courses}
                                    sessions={sessions}
                                    onSessionSave={handleSessionSave}
                                    onSessionUpdate={handleSessionUpdate}
                                    onSessionDelete={handleSessionDelete}
                                />
                            )}
                            {activeView === 'categories' && (
                                <CategoryManager
                                    categories={categories}
                                    onCategoryAdd={handleCategoryAdd}
                                    onCategoryUpdate={handleCategoryUpdate}
                                    onCategoryDelete={handleCategoryDelete}
                                />
                            )}
                            {activeView === 'bookings' && (
                                <ErrorBoundary>
                                    <BookingsManagement />
                                </ErrorBoundary>
                            )}
                            {activeView === 'settings' && <ContentManager />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
