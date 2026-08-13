import { Router } from 'express';
import { getAllShops, getShopById, registerShop, updateShopProfile, updateShopStatus } from '../controllers/shop.controller';
import { restaurantController } from '../controllers/restaurant.controller';
import { validateRestaurantId, validateStatusUpdate, validateMediaUpload, validateLanguage } from '../middleware/restaurant.middleware';

const router = Router();

// GET all shops (with optional ?type=SWEETS filter)
router.get('/', getAllShops);
router.get('/type/:type', getAllShops);

// Register shop
router.post('/register', registerShop);

// Shop profile by ID
router.get('/:shopId', getShopById);
router.put('/:shopId', updateShopProfile);

// GET & UPDATE shop status
router.get('/status/:restaurantId', validateRestaurantId, restaurantController.getStatus);
router.get('/:restaurantId/status', validateRestaurantId, restaurantController.getStatus);
router.put('/status/:restaurantId', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.put('/:restaurantId/status', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.patch('/status/:restaurantId', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.patch('/:restaurantId/status', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);

// GET & UPDATE shop settings
router.get('/settings/:restaurantId', validateRestaurantId, restaurantController.getSettings);
router.put('/settings/:restaurantId', validateRestaurantId, validateLanguage, restaurantController.updateSettings);

// Item Availability Toggle
router.patch('/menu/:itemId/availability', restaurantController.updateAvailability);
router.put('/menu/:itemId/availability', restaurantController.updateAvailability);

// Direct S3 Upload Route
router.post('/upload-s3', validateMediaUpload, restaurantController.uploadMedia);

export default router;
