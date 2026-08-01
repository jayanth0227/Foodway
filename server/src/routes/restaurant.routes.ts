import { Router } from 'express';
import { restaurantController } from '../controllers/restaurant.controller';
import { validateRestaurantId, validateStatusUpdate, validateMediaUpload, validateLanguage } from '../middleware/restaurant.middleware';

const router = Router();

// GET & UPDATE restaurant status
router.get('/status/:restaurantId', validateRestaurantId, restaurantController.getStatus);
router.get('/:restaurantId/status', validateRestaurantId, restaurantController.getStatus);
router.put('/status/:restaurantId', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.put('/:restaurantId/status', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.patch('/status/:restaurantId', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);
router.patch('/:restaurantId/status', validateRestaurantId, validateStatusUpdate, restaurantController.updateStatus);

// GET & UPDATE restaurant settings (language, sound alerts, currency)
router.get('/settings/:restaurantId', validateRestaurantId, restaurantController.getSettings);
router.put('/settings/:restaurantId', validateRestaurantId, validateLanguage, restaurantController.updateSettings);

// Menu Item Availability Toggle
router.patch('/menu/:itemId/availability', restaurantController.updateAvailability);
router.put('/menu/:itemId/availability', restaurantController.updateAvailability);

// Direct S3 Upload Route (FEATURE 7)
router.post('/upload-s3', validateMediaUpload, restaurantController.uploadMedia);

export default router;
