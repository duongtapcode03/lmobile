import React, { useCallback } from 'react';
import { Card } from 'antd';
import { Link } from 'react-router-dom';
import type { Category } from '../../api/categoryService';
import './CategoryCard.scss';

interface CategoryCardProps {
  category: Category;
}

/**
 * CategoryCard Component (Refactored)
 * 
 * Improvements:
 * - React.memo để tránh re-render không cần thiết
 * - useCallback cho error handler
 * - Better error handling với fallback image
 * - Accessibility improvements
 */
const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-category.png';
    target.onerror = null; // Prevent infinite loop
  }, []);

  const categoryUrl = `/category/${category.slug || category._id}`;
  const imageAlt = category.name || 'Category';

  return (
    <Link 
      to={categoryUrl} 
      className="category-card-link"
      aria-label={`View ${category.name} category`}
    >
      <Card
        className="category-card"
        hoverable
        cover={
          <div className="category-image-wrapper">
            {category.image ? (
              <img 
                src={category.image} 
                alt={imageAlt}
                className="category-image"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="category-icon" role="img" aria-label={imageAlt}>
                {category.icon || '📦'}
              </div>
            )}
          </div>
        }
      >
        <div className="category-name">{category.name}</div>
        {category.description && (
          <div className="category-description">{category.description}</div>
        )}
      </Card>
    </Link>
  );
};

export default React.memo(CategoryCard);

