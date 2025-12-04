import React from 'react';
import { Collapse, Checkbox } from 'antd';
import type { FilterOption } from '../../constants/filterOptions';
import './CategorySidebar.scss';

interface CheckboxFilterProps {
  title: string;
  filterKey: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string, checked: boolean) => void;
  defaultActive?: boolean;
}

/**
 * CheckboxFilter Component
 * Generic component để render checkbox filter
 * Single Responsibility: Chỉ render checkbox filter
 * Reusable: Có thể dùng cho storage, nfc, refreshRate, battery, screenSize
 */
const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
  title,
  filterKey,
  options,
  selectedValues,
  onToggle,
  defaultActive = false,
}) => {
  const handleChange = (value: string, checked: boolean) => {
    onToggle(value, checked);
  };

  const collapseItems = [
    {
      key: filterKey,
      label: <h3>{title}</h3>,
      className: 'v5-filter',
      children: (
        <div className="options">
          <ul>
            {options.map((option) => (
              <li key={option.value}>
                <span>
                  <Checkbox
                    checked={selectedValues.includes(option.value)}
                    onChange={(e) => handleChange(option.value, e.target.checked)}
                    aria-label={option.label}
                  />
                </span>
                <label>
                  <span>{option.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <Collapse
      ghost
      defaultActiveKey={defaultActive ? [filterKey] : []}
      className="v5-filter-collapse"
      items={collapseItems}
    />
  );
};

export default React.memo(CheckboxFilter);
















