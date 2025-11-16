import React, { useMemo } from 'react';
import { Menu } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import type { Category } from '../../api/categoryService';
import './CategorySidebar.scss';

interface CategoryMenuProps {
  categories: Category[];
  selectedCategoryId: string | null;
}

/**
 * CategoryMenu Component
 * Hiển thị danh sách categories dạng menu
 * Single Responsibility: Chỉ render category menu
 */
const CategoryMenu: React.FC<CategoryMenuProps> = ({ categories, selectedCategoryId }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: Category, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (category.slug) {
      navigate(`/category/${category.slug}`);
    }
  };

  // Memoize menuItems để tránh re-render không cần thiết
  const menuItems: MenuProps['items'] = useMemo(
    () =>
      categories.map((category) => ({
        key: String(category._id),
        label: (
          <Link
            to={`/category/${category.slug || category._id}`}
            className={`category-menu-item ${selectedCategoryId === String(category._id) ? 'active' : ''}`}
            onClick={(e) => handleCategoryClick(category, e)}
          >
            {category.icon && <span className="category-icon">{category.icon}</span>}
            <span className="category-name">{category.name}</span>
          </Link>
        ),
      })),
    [categories, selectedCategoryId]
  );

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-title">
        <h3>Danh mục sản phẩm</h3>
      </div>
      <Menu
        mode="vertical"
        items={menuItems}
        className="category-menu"
        selectedKeys={selectedCategoryId ? [selectedCategoryId] : []}
      />
    </div>
  );
};

export default React.memo(CategoryMenu);






