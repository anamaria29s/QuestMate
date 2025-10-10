import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './TaskCategory.css';
import { useNotifications } from './NotificationContext';

const colorOptions = [
  '#8a2be2', // Purple (default)
  '#1a237e', // Dark blue
  '#00796b', // Teal
  '#d32f2f', // Red
  '#f57c00', // Orange
  '#388e3c', // Green
  '#7b1fa2', // Purple
  '#c2185b', // Pink
  '#0288d1', // Light blue
  '#fbc02d', // Yellow
  '#5d4037', // Brown
  '#455a64'  // Blue grey
];

const defaultCategories = [
  { name: 'Personal', color: '#8a2be2' },
  { name: 'Work', color: '#1a237e' },
  { name: 'Health', color: '#4caf50' },
  { name: 'Study', color: '#ff9800' }
];

const TaskCategory = ({ onCategorySelect, selectedCategory }) => {
  const [categories, setCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8a2be2'); 
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [nameError, setNameError] = useState(''); // Add this state
  const { addNotification } = useNotifications();

  // Move validateCategoryName function before it's used
  const validateCategoryName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return 'Category name is required';
    }
    
    // Check for duplicate names (case-insensitive)
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === trimmedName.toLowerCase() && 
      cat.id !== isEditingCategory // Exclude current category when editing
    );
    
    if (existingCategory) {
      return 'A category with this name already exists';
    }
    
    return null;
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/task-categories/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
      });

      if (response.data.length === 0) {
        await createDefaultCategories(); 
      } else {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load task categories'
      });
    }
  }, [addNotification]);

  const createDefaultCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('access');

      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await axios.get('http://127.0.0.1:8000/api/task-categories/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const existingCategories = response.data;

      const createdCategories = [];

      for (const category of defaultCategories) {
        const alreadyExists = existingCategories.some(
          (existing) => existing.name.toLowerCase() === category.name.toLowerCase()
        );

        if (!alreadyExists) {
          const res = await axios.post('http://127.0.0.1:8000/api/task-categories/', category, {
            headers: { Authorization: `Bearer ${token}` }
          });
          createdCategories.push(res.data);
        }
      }

      fetchCategories();

      if (createdCategories.length > 0) {
        addNotification({
          type: 'success',
          title: 'Categories Initialized',
          message: 'Default categories created.'
        });
      }
    } catch (error) {
      console.error("Error creating default categories:", error);
      addNotification({
        type: 'error',
        title: 'Category Creation Failed',
        message: 'Could not create default categories'
      });
    }
  }, [addNotification, fetchCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleColorSelect = (color) => {
    setCategoryColor(color);
    console.log('Selected color:', color);
  };

  // Enhanced name change handler with real-time validation
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setCategoryName(newName);
    
    // Clear previous error
    setNameError('');
    
    // Real-time validation
    if (newName.trim()) {
      const error = validateCategoryName(newName);
      setNameError(error || '');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    // Validate category name
    const validationError = validateCategoryName(categoryName);
    if (validationError) {
      setNameError(validationError);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: validationError
      });
      return;
    }

    console.log('Submitting category:', {
      name: categoryName.trim(),
      color: categoryColor,
      isEditing: isEditingCategory
    });

    try {
      const categoryData = {
        name: categoryName.trim(),
        color: categoryColor
      };

      const token = localStorage.getItem('access');
      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (isEditingCategory) {
        const response = await axios.put(
          `http://127.0.0.1:8000/api/task-categories/${isEditingCategory}/update/`,
          categoryData,
          config
        );
        console.log('Update response:', response.data);
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Category updated successfully'
        });
      } else {
        const response = await axios.post(
          'http://127.0.0.1:8000/api/task-categories/',
          categoryData,
          config
        );
        console.log('Create response:', response.data);
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'New category created'
        });
      }

      // Reset form and close
      setCategoryName('');
      setCategoryColor('#8a2be2');
      setNameError('');
      setIsAddingCategory(false);
      setIsEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle specific validation errors
      let errorMessage = isEditingCategory 
        ? 'Failed to update category' 
        : 'Failed to create category';
      
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        
        // Handle non_field_errors (like duplicate name)
        if (errorData.non_field_errors && errorData.non_field_errors.length > 0) {
          errorMessage = errorData.non_field_errors[0];
        }
        // Handle field-specific errors
        else if (errorData.name && errorData.name.length > 0) {
          errorMessage = `Name: ${errorData.name[0]}`;
        }
        // Handle other field errors
        else {
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          }
        }
      }
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const handleEditCategory = (category) => {
    setIsEditingCategory(category.id);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setNameError(''); // Clear any existing errors
    setIsAddingCategory(true);
    setShowCategoryMenu(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        // Use standard REST endpoint for delete
        await axios.delete(`http://127.0.0.1:8000/api/task-categories/${categoryId}/delete/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
        
        if (selectedCategory === categoryId) {
          onCategorySelect(null);
        }
        
        fetchCategories();
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Category deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete category'
        });
      }
    }
  };

  const resetForm = () => {
    setCategoryName('');
    setCategoryColor('#8a2be2');
    setNameError('');
    setIsEditingCategory(null);
    // Don't set isAddingCategory to false here - that would hide the form
  };

  const toggleCategoryMenu = () => {
    setShowCategoryMenu(!showCategoryMenu);
  };

  const handleCancelForm = () => {
    setCategoryName('');
    setCategoryColor('#8a2be2');
    setNameError('');
    setIsAddingCategory(false);
    setIsEditingCategory(null);
  };

  return (
    <div className="task-category-manager">
      <div className="category-selector">
        <button 
          className="category-menu-button" 
          onClick={toggleCategoryMenu}
          aria-expanded={showCategoryMenu}
        >
          <span className="category-indicator" style={{ 
            backgroundColor: selectedCategory ? 
              categories.find(c => c.id === selectedCategory)?.color : 
              'transparent' 
          }}></span>
          <span className="category-button-text">
            {selectedCategory ? 
              categories.find(c => c.id === selectedCategory)?.name : 
              'All Categories'}
          </span>
          <span className="category-dropdown-icon">▼</span>
        </button>

        {showCategoryMenu && (
          <div className="category-dropdown">
            <div 
              className="category-item all-categories"
              onClick={() => {
                onCategorySelect(null);
                setShowCategoryMenu(false);
              }}
            >
              All Categories
            </div>
            {categories.map(category => (
              <div 
                key={category.id} 
                className={`category-item ${String(selectedCategory) === String(category.id) ? 'selected' : ''}`}
                onClick={() => {
                  onCategorySelect(category.id);
                  setShowCategoryMenu(false);
                }}
              >
                <span 
                  className="category-color-dot" 
                  style={{ backgroundColor: category.color }}
                ></span>
                <span className="category-name">{category.name}</span>
                <div className="category-actions">
                  <button 
                    className="category-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(category);
                    }}
                  >
                    ✎
                  </button>
                  <button 
                    className="category-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button 
              className="add-category-btn"
              onClick={() => {
                setIsAddingCategory(true);
                setIsEditingCategory(null);
                setCategoryName('');
                setCategoryColor('#8a2be2');
                setNameError('');
                setShowCategoryMenu(false);
              }}
            >
              + Add New Category
            </button>
          </div>
        )}
      </div>

      {isAddingCategory && (
        <div className="category-form-container">
          <form onSubmit={handleCategorySubmit} className="category-form">
            <h4>{isEditingCategory ? 'Edit Category' : 'Add New Category'}</h4>
            <div className="form-group">
              <label>Category Name</label>
              <input
                type="text"
                value={categoryName}
                onChange={handleNameChange}
                placeholder="Enter category name"
                className={nameError ? 'error' : ''}
                required
              />
              {nameError && <div className="error-message">{nameError}</div>}
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-options">
                {colorOptions.map((color) => (
                  <div 
                    key={color} 
                    className={`color-option ${color === categoryColor ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                  />
                ))}
              </div>
              <input
                type="color"
                value={categoryColor}
                onChange={(e) => {
                  setCategoryColor(e.target.value);
                  console.log('Color picker changed:', e.target.value);
                }}
                className="color-picker"
              />
            </div>

            <div className="form-buttons">
              <button type="button" onClick={handleCancelForm} className="cancel-btn">
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!!nameError || !categoryName.trim()}
              >
                {isEditingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskCategory;