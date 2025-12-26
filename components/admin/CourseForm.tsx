
import React, { useState, useEffect, FormEvent } from 'react';
import { Course, Category } from '../../types';

interface CourseFormProps {
  course: Course | null;
  categories: Category[];
  onSave: (course: Omit<Course, 'id'> | Course) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const CourseForm: React.FC<CourseFormProps> = ({ course, categories, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [importantHighlight, setImportantHighlight] = useState('');
  const [sku, setSku] = useState('');

  useEffect(() => {
    if (course) {
      setName(course.name);
      setPrice(course.price);
      setCategory(course.category);
      setTermsAndConditions(course.termsAndConditions);
      setIsHidden(course.isHidden || false);
      setImportantHighlight(course.importantHighlight || '');
      setSku(course.sku || '');
    } else {
      setName('');
      setPrice(0);
      setCategory(categories[0]?.name || '');
      setTermsAndConditions('');
      setIsHidden(false);
      setImportantHighlight('');
      setSku('');
    }
  }, [course, categories]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const courseData = { name, price, category, termsAndConditions, isHidden, importantHighlight, sku };
    if (course) {
      onSave({ ...courseData, id: course.id });
    } else {
      onSave(courseData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">{course ? 'Edit Course' : 'Add New Course'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Course Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">SKU (Stock Keeping Unit)</label>
                    <input type="text" value={sku} onChange={e => setSku(e.target.value)} required placeholder="SKU-COURSE-001" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white"/>
                    <p className="mt-1 text-xs text-slate-500">Must match the SKU in your Loyverse Back Office exactly.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Price (RM)</label>
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
                        {categories.length === 0 ? (
                            <option disabled>Please add a category first</option>
                        ) : (
                            categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Terms & Conditions</label>
                    <textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} required rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Important Highlight (Optional)</label>
                    <textarea value={importantHighlight} onChange={e => setImportantHighlight(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-900 bg-white" placeholder="e.g., Early bird discount ends soon!"></textarea>
                </div>
                 <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={isHidden}
                            onChange={e => setIsHidden(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">Hide course from storefront</span>
                    </label>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-blue-400"
                        disabled={isSaving || categories.length === 0}
                    >
                        {isSaving ? 'Saving...' : 'Save Course'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default CourseForm;