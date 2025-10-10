import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './SharedTaskCategory.css';
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

const SharedTaskCategory = ({ calendarId, onCategorySelect, selectedCategory }) => {
  const [categories, setCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8a2be2'); 
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotifications();

  const validateCategoryName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return 'Category name is required';
    }
    
    // Check for duplicate names (case-insensitive)
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === trimmedName.toLowerCase() && 
      cat.id !== isEditingCategory
    );
    
    if (existingCategory) {
      return 'A category with this name already exists';
    }
    
    return null;
  };

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://127.0.0.1:8000/api/shared-calendars/${parseInt(calendarId)}/categories/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load task categories'
      });
    } finally {
      setIsLoading(false);
    }
  }, [calendarId, addNotification]);

  useEffect(() => {
    if (calendarId) {
      fetchCategories();
    }
  }, [fetchCategories, calendarId]);

  const handleColorSelect = (color) => {
    setCategoryColor(color);
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setCategoryName(newName);
    setNameError('');
    
    if (newName.trim()) {
      const error = validateCategoryName(newName);
      setNameError(error || '');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
  
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

    try {
      setIsLoading(true);
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
        await axios.put(
          `http://127.0.0.1:8000/api/shared-calendars/${parseInt(calendarId)}/categories/${parseInt(isEditingCategory)}/update/`,
          categoryData,
          config
        );
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Category updated successfully'
        });
      } else {
        await axios.post(
          `http://127.0.0.1:8000/api/shared-calendars/${parseInt(calendarId)}/categories/create/`,
          categoryData,
          config
        );
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
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      
      let errorMessage = isEditingCategory 
        ? 'Failed to update category' 
        : 'Failed to create category';
      
      // Handle different error response structures
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 400 && data) {
          if (data.non_field_errors && data.non_field_errors.length > 0) {
            errorMessage = data.non_field_errors[0];
          } else if (data.name && data.name.length > 0) {
            errorMessage = `Name: ${data.name[0]}`;
          } else {
            const firstError = Object.values(data)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0];
            }
          }
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (status === 404) {
          errorMessage = 'Category or calendar not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setIsEditingCategory(category.id);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setNameError('');
    setIsAddingCategory(true);
    setShowCategoryMenu(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        setIsLoading(true);
        await axios.delete(`http://127.0.0.1:8000/api/shared-calendars/${parseInt(calendarId)}/categories/${parseInt(categoryId)}/delete/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
        });
        
        if (selectedCategory === categoryId || String(selectedCategory) === String(categoryId)) {
          onCategorySelect(null); 
        }
        
        await fetchCategories();
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Category deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        
        let errorMessage = 'Failed to delete category';
        if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete this category.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Category not found.';
        }
        
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelForm = () => {
    setCategoryName('');
    setCategoryColor('#8a2be2');
    setNameError('');
    setIsAddingCategory(false);
    setIsEditingCategory(null);
  };

  const toggleCategoryMenu = () => {
    setShowCategoryMenu(!showCategoryMenu);
  };

  const isAllCategoriesSelected = () => {
    return selectedCategory === null || selectedCategory === 'all' || selectedCategory === undefined;
  };

  if (!calendarId) {
    return null;
  }

  return (
    <div className="shared-task-category-manager">
      <div className="shared-category-selector">
        <button 
          className="shared-category-menu-button" 
          onClick={toggleCategoryMenu}
          aria-expanded={showCategoryMenu}
          disabled={isLoading}
        >
          <span className="shared-category-indicator" style={{ 
            backgroundColor: !isAllCategoriesSelected() ? 
              categories.find(c => c.id === parseInt(selectedCategory))?.color : 
              'transparent' 
          }}></span>
          <span className="shared-category-button-text">
            {!isAllCategoriesSelected() ? 
              categories.find(c => c.id === parseInt(selectedCategory))?.name : 
              'All Categories'}
          </span>
          <span className="shared-category-dropdown-icon">▼</span>
        </button>

        {showCategoryMenu && (
          <div className="shared-category-dropdown">
            <div 
              className={`shared-category-item shared-category-item all-categories ${isAllCategoriesSelected() ? 'selected' : ''}`}
              onClick={() => {
                onCategorySelect(null); // Changed from 'all' to null
                setShowCategoryMenu(false);
              }}
            >
              All Categories
            </div>
            {categories.map(category => (
              <div 
                key={category.id} 
                className={`shared-category-item ${String(selectedCategory) === String(category.id) ? 'selected' : ''}`}
                onClick={() => {
                  onCategorySelect(category.id);
                  setShowCategoryMenu(false);
                }}
              >
                <span 
                  className="shared-category-color-dot" 
                  style={{ backgroundColor: category.color }}
                ></span>
                <span className="shared-category-name">{category.name}</span>
                <div className="shared-category-actions">
                  <button 
                    className="shared-category-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCategory(category);
                    }}
                    disabled={isLoading}
                  >
                    ✎
                  </button>
                  <button 
                    className="shared-category-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button 
              className="shared-add-category-btn"
              onClick={() => {
                setIsAddingCategory(true);
                setIsEditingCategory(null);
                setCategoryName('');
                setCategoryColor('#8a2be2');
                setNameError('');
                setShowCategoryMenu(false);
              }}
              disabled={isLoading}
            >
              + Add New Category
            </button>
          </div>
        )}
      </div>

      {isAddingCategory && (
        <div className="shared-category-form-container">
          <form onSubmit={handleCategorySubmit} className="shared-category-form">
            <h4>{isEditingCategory ? 'Edit Category' : 'Add New Category'}</h4>
            <div className="shared-form-group">
              <label>Category Name</label>
              <input
                type="text"
                value={categoryName}
                onChange={handleNameChange}
                placeholder="Enter category name"
                className={nameError ? 'error' : ''}
                disabled={isLoading}
                required
              />
              {nameError && <div className="shared-error-message">{nameError}</div>}
            </div>

            <div className="shared-form-group">
              <label>Color</label>
              <div className="shared-color-options">
                {colorOptions.map((color) => (
                  <div 
                    key={color} 
                    className={`shared-color-option ${color === categoryColor ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => !isLoading && handleColorSelect(color)}
                  />
                ))}
              </div>
              <input
                type="color"
                value={categoryColor}
                onChange={(e) => setCategoryColor(e.target.value)}
                className="shared-color-picker"
                disabled={isLoading}
              />
            </div>

            <div className="shared-form-buttons">
              <button 
                type="button" 
                onClick={handleCancelForm} 
                className="shared-cancel-btn"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="shared-submit-btn"
                disabled={!!nameError || !categoryName.trim() || isLoading}
              >
                {isLoading ? 'Processing...' : (isEditingCategory ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SharedTaskCategory;