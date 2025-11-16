import React, { useState, useRef, useEffect } from 'react';
import { Carousel } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { CarouselRef } from 'antd/es/carousel';
import './BannerCarousel.scss';

export interface Banner {
  _id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive?: boolean;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoplay?: boolean;
  autoplaySpeed?: number;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ 
  banners, 
  autoplay = true,
  autoplaySpeed = 5000 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(4);
  const mainCarouselRef = useRef<CarouselRef>(null);
  const thumbCarouselRef = useRef<CarouselRef>(null);
  const isSyncingRef = useRef(false);

  // Handle responsive slidesToShow
  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth;
      if (width < 576) {
        setSlidesToShow(1);
      } else if (width < 768) {
        setSlidesToShow(2);
      } else if (width < 1200) {
        setSlidesToShow(3);
      } else {
        setSlidesToShow(4);
      }
    };

    updateSlidesToShow();
    window.addEventListener('resize', updateSlidesToShow);
    return () => window.removeEventListener('resize', updateSlidesToShow);
  }, []);

  const activeBanners = banners.filter(banner => banner.isActive !== false);

  if (activeBanners.length === 0) {
    return null;
  }

  const handleMainChange = (current: number) => {
    setCurrentSlide(current);
    
    // Sync thumbnail carousel to main carousel
    if (thumbCarouselRef.current && !isSyncingRef.current) {
      isSyncingRef.current = true;
      thumbCarouselRef.current.goTo(current, false);
      
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    }
  };

  const handleThumbChange = (current: number) => {
    // Only handle manual scroll, not programmatic changes
    // This will be handled by handleThumbClick instead
  };

  const handlePrev = () => {
    mainCarouselRef.current?.prev();
  };

  const handleNext = () => {
    mainCarouselRef.current?.next();
  };

  const handleThumbClick = (index: number) => {
    if (index !== currentSlide) {
      isSyncingRef.current = true;
      setCurrentSlide(index);
      
      // Sync main carousel to clicked thumbnail
      if (mainCarouselRef.current) {
        mainCarouselRef.current.goTo(index);
      }
      
      // Also sync thumbnail carousel to ensure it's at the right position
      if (thumbCarouselRef.current) {
        thumbCarouselRef.current.goTo(index, false);
      }
      
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    }
  };

  return (
    <div className="banner-carousel-wrapper">
      <div className="main-slider-container">
        {/* Main Banner Carousel */}
        <div className="top-slider-content">
          <button 
            type="button"
            className="slick-product-prev slick-arrow"
            onClick={handlePrev}
            aria-label="Previous"
          >
            <LeftOutlined />
          </button>

          <Carousel
            ref={mainCarouselRef}
            autoplay={autoplay}
            autoplaySpeed={autoplaySpeed}
            dots={false}
            infinite={true}
            effect="fade"
            afterChange={handleMainChange}
            className="banner-carousel-main"
          >
            {activeBanners.map((banner, index) => (
              <div key={banner._id || index} className="banner-slide">
                <a
                  href={banner.linkUrl || '#'}
                  target={banner.linkUrl?.startsWith('http') ? '_blank' : '_self'}
                  rel={banner.linkUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="banner-link"
                >
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title}
                    className="banner-image"
                    style={{ width: '100%' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-banner.png';
                    }}
                  />
                </a>
              </div>
            ))}
          </Carousel>

          <button 
            type="button"
            className="slick-product-next slick-arrow"
            onClick={handleNext}
            aria-label="Next"
          >
            <RightOutlined />
          </button>
        </div>

        {/* Thumbnail Navigation Carousel */}
        <div className="top-slider-thumb">
          <Carousel
            ref={thumbCarouselRef}
            autoplay={false}
            dots={true}
            infinite={false}
            slidesToShow={slidesToShow}
            slidesToScroll={1}
            afterChange={handleThumbChange}
            className="banner-carousel-thumb"
          >
            {activeBanners.map((banner, index) => (
              <div 
                key={banner._id || index} 
                className={`slides ${currentSlide === index ? 'slick-active' : ''}`}
                onClick={() => handleThumbClick(index)}
              >
                <strong>{banner.title}</strong>
                {banner.subtitle && <small>{banner.subtitle}</small>}
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </div>
  );
};

export default BannerCarousel;
