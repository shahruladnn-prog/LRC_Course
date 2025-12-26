
import React, { useState, FormEvent } from 'react';
import { Category } from '../../types';
import ConfirmationModal from '../common/ConfirmationModal';

interface CategoryManagerProps {
    categories: Category[];
    onCategoryAdd: (category: Omit<Category, 'id'>) => Promise<void>;
    onCategoryUpdate: (categoryId: string, categoryData: Partial<Category>) => Promise<void>;
    onCategoryDelete: (categoryId: string) => Promise<void>;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onCategoryAdd, onCategoryUpdate, onCategoryDelete }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsSaving(true);
        await onCategoryAdd({ name: newCategoryName });
        setIsSaving(false);
        setNewCategoryName('');
    };

    const handleEditClick = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
    };

    const handleCancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };
    
    const handleUpdate = async () => {
        if (!editingCategoryId || !editingCategoryName.trim()) return;
        setIsSaving(true);
        await onCategoryUpdate(editingCategoryId, { name: editingCategoryName });
        setIsSaving(false);
        handleCancelEdit();
    };

    const handleDeleteClick = (categoryId: string) => {
        setCategoryToDelete(categoryId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (categoryToDelete) {
            setIsDeleting(true);
            await onCategoryDelete(categoryToDelete);
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setCategoryToDelete(null);
        }
    };
    
    const handleCancelDelete = () => {
        setIsConfirmModalOpen(false);
        setCategoryToDelete(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category? This action cannot be undone."
                confirmText="Delete"
                isConfirming={isDeleting}
            />

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Existing Categories</h2>
                {categories.length > 0 ? (
                     <div className="border border-slate-200 rounded-lg">
                        <ul className="divide-y divide-slate-200">
                        {categories.map(category => (
                            <li key={category.id} className="p-4 flex justify-between items-center">
                                {editingCategoryId === category.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input 
                                            type="text"
                                            value={editingCategoryName}
                                            onChange={e => setEditingCategoryName(e.target.value)}
                                            className="flex-grow px-2 py-1 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
                                        />
                                        <button onClick={handleUpdate} disabled={isSaving} className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-green-400">{isSaving ? 'Saving...' : 'Save'}</button>
                                        <button onClick={handleCancelEdit} className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-md">Cancel</button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-800">{category.name}</span>
                                        <div className="flex items-center gap-4">
                                             <button onClick={() => handleEditClick(category)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                            <button 
                                                onClick={() => handleDeleteClick(category.id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                     </div>
                ) : (
                    <p className="text-slate-500">No categories found. Add one to get started.</p>
                )}
            </div>
             <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Add New Category</h3>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="category-name" className="block text-sm font-medium text-slate-700">Category Name</label>
                        <input
                            id="category-name"
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Digital Marketing"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900"
                        />
                     </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-indigo-400"
                    >
                        {isSaving ? 'Adding...' : 'Add Category'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CategoryManager;