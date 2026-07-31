# Foodway Client App 🍔✨

This is the frontend client application for **Foodway**, a premium food ordering and luxury delivery platform.

---

## 🛠️ Tech Stack & Dependencies

*   **React 19 & TypeScript**: Component-driven architecture and full compile-time type-safety.
*   **Vite**: The build tool and development server.
*   **TailwindCSS**: Utilitarian styles extended with custom themes, colors, and keyframe animations.
*   **Framer Motion & GSAP**: Animations, glowing cursor trails, and premium component transitions.
*   **Lenis**: High-performance smooth scrolling.
*   **React Context**: Custom cart management system (`CartContext.tsx`).
*   **React Icons**: Luxury vector icons used across navigation, categories, and menus.
*   **Swiper**: Rich sliders for featured offers and testimonial cards.
*   **Oxlint**: Lightning-fast linter to keep code clean and performant.

---

## 🚀 Available Scripts

In the `Foodway/client` directory, you can run the following commands:

### `npm run dev`
Runs the app in development mode.
Open [http://localhost:5173](http://localhost:5173) to view it in your browser. The page will reload when you make edits.

### `npm run build`
Builds the app for production to the `dist` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run lint`
Runs `oxlint` to analyze the code for bugs, anti-patterns, and styling violations.

### `npm run preview`
Locally previews the production build.

---

## ⚙️ Environment Configuration

Create a `.env` file in this directory based on the `.env.example` file:

```env
VITE_API_BASE_URL=         # Backend API Base URL (point to http://localhost:5000/api in development)
VITE_FIREBASE_API_KEY=     # Firebase project API key
VITE_FIREBASE_PROJECT_ID=  # Firebase Project ID
VITE_FIREBASE_APP_ID=      # Firebase Application ID
VITE_GOOGLE_MAP_KEY=       # Google Maps API key (for live tracking/address)
VITE_CLOUDINARY_CLOUD_NAME= # Cloudinary account cloud name (for image uploads)
```


