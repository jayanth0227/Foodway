import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '../components/home/Hero';
import Categories from '../components/home/Categories';
import FeaturedShops from '../components/home/FeaturedShops';
import PopularDishes from '../components/home/PopularDishes';
import DeliveryLocations from '../components/home/DeliveryLocations';
import DeliveryProcess from '../components/home/DeliveryProcess';
import Testimonials from '../components/home/Testimonials';
import FAQ from '../components/home/FAQ';
import Newsletter from '../components/home/Newsletter';

interface HomeProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenAuth }) => {
  return (
    <>
      <Helmet>
        <title>MK Delivery Services | Quick-Commerce & Multi-Category Local Marketplace</title>
        <meta
          name="description"
          content="Instant delivery of sweets, vegetables, fruits, groceries, dairy, and food items from local merchant shops delivered straight to your doorstep."
        />
        <meta name="keywords" content="quick commerce delivery, local marketplace, sweets delivery, grocery delivery, fresh vegetables" />
      </Helmet>

      <div className="relative">
        <Hero onOpenAuth={onOpenAuth} />

        {/* Live Delivery Locations Auto-Scrolling Ticker Ribbon (Right under Hero & before Categories) */}
        <DeliveryLocations />

        <Categories />
        <FeaturedShops />
        <PopularDishes />
        <DeliveryProcess />
        <Testimonials />
        <FAQ />
        <Newsletter />
      </div>
    </>
  );
};

export default Home;
