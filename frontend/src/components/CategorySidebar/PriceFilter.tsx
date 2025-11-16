import React, { useCallback, useMemo } from 'react';
import { Collapse, Slider, Input } from 'antd';
import { PRICE_PRESETS, MAX_PRICE, DEFAULT_PRICE_RANGE } from '../../constants/filterOptions';
import { formatPrice, formatPriceInput, parsePrice } from '../../utils/priceFormatter';
import './CategorySidebar.scss';

interface PriceFilterProps {
  priceRange: [number, number];
  priceMin: string;
  priceMax: string;
  onPriceRangeChange: (range: [number, number]) => void;
  onPriceInputChange: (min: string, max: string) => void;
}

/**
 * PriceFilter Component
 * Hiển thị filter theo giá
 * Single Responsibility: Chỉ render price filter
 */
const PriceFilter: React.FC<PriceFilterProps> = ({
  priceRange,
  priceMin,
  priceMax,
  onPriceRangeChange,
  onPriceInputChange,
}) => {
  const handleSliderChange = useCallback(
    (value: number | number[]) => {
      if (Array.isArray(value) && value.length === 2) {
        const range = [value[0], value[1]] as [number, number];
        onPriceRangeChange(range);
      }
    },
    [onPriceRangeChange]
  );

  const handlePresetClick = useCallback(
    (e: React.MouseEvent, min: number, max: number) => {
      e.preventDefault();
      onPriceRangeChange([min, max]);
    },
    [onPriceRangeChange]
  );

  const handleMinInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '');
      onPriceInputChange(value, priceMax);
    },
    [priceMax, onPriceInputChange]
  );

  const handleMaxInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '');
      onPriceInputChange(priceMin, value);
    },
    [priceMin, onPriceInputChange]
  );

  const handleInputBlur = useCallback(() => {
    const min = parsePrice(priceMin) || DEFAULT_PRICE_RANGE[0];
    const max = parsePrice(priceMax) || DEFAULT_PRICE_RANGE[1];
    onPriceRangeChange([min, max]);
  }, [priceMin, priceMax, onPriceRangeChange]);

  const collapseItems = useMemo(
    () => [
      {
        key: 'price',
        label: <h3>Mức giá</h3>,
        className: 'v5-filter',
        children: (
          <div className="price-range">
            <section className="range-slider">
              <Slider
                range
                min={0}
                max={MAX_PRICE}
                step={100000}
                value={priceRange}
                onChange={handleSliderChange}
                tooltip={{
                  formatter: (value) => formatPrice(value || 0),
                }}
              />
            </section>
            <div className="form-price-range">
              <Input
                className="js-price"
                value={formatPriceInput(priceMin)}
                placeholder="Từ"
                onChange={handleMinInputChange}
                onBlur={handleInputBlur}
                aria-label="Minimum price"
              />
              <Input
                className="js-price"
                value={formatPriceInput(priceMax)}
                placeholder="Đến"
                onChange={handleMaxInputChange}
                onBlur={handleInputBlur}
                aria-label="Maximum price"
              />
            </div>
            <ul className="filter-list-price">
              {PRICE_PRESETS.map((preset) => (
                <li key={`${preset.min}-${preset.max}`}>
                  <a
                    href="#"
                    onClick={(e) => handlePresetClick(e, preset.min, preset.max)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePresetClick(e as any, preset.min, preset.max);
                      }
                    }}
                  >
                    {preset.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ),
      },
    ],
    [priceRange, priceMin, priceMax, handleSliderChange, handlePresetClick, handleMinInputChange, handleMaxInputChange, handleInputBlur]
  );

  return (
    <Collapse
      ghost
      defaultActiveKey={['price']}
      className="v5-filter-collapse"
      items={collapseItems}
    />
  );
};

export default React.memo(PriceFilter);

