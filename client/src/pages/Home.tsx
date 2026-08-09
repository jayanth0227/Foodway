import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '../components/home/Hero';
import Categories from '../components/home/Categories';
import FeaturedRestaurants from '../components/home/FeaturedRestaurants';
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
        <title>MK Delivery Services | Premium Food Ordering & Luxury Delivery</title>
        <meta
          name="description"
          content="Experience the finest culinary masterpieces delivered to your estate with white-glove courier service. Savor woodfired truffle pizzas, gold-leaf lobster biryanis, and michelin-recommended dishes."
        />
        <meta name="keywords" content="premium food delivery, luxury dining, michelin food delivery, gold leaf biryani, truffle pizza delivery" />
      </Helmet>

      <div className="relative">
        <Hero onOpenAuth={onOpenAuth} />

        {/* Live Delivery Locations Auto-Scrolling Ticker Ribbon (Right under Hero & before Categories) */}
        <DeliveryLocations />

        <Categories />
        <FeaturedRestaurants />
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
