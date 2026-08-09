import { Router } from 'express';
import deliveryLocationController from '../controllers/deliveryLocation.controller';

const router = Router();

// Public user endpoint
router.get('/delivery-locations', (req, res) => deliveryLocationController.getPublicLocations(req, res));

// Admin management endpoints
router.get('/admin/delivery-locations', (req, res) => deliveryLocationController.getAdminLocations(req, res));
router.post('/admin/delivery-locations', (req, res) => deliveryLocationController.createLocation(req, res));
router.get('/admin/delivery-locations/:id', (req, res) => deliveryLocationController.getLocationById(req, res));
router.put('/admin/delivery-locations/:id', (req, res) => deliveryLocationController.updateLocation(req, res));
router.patch('/admin/delivery-locations/:id/status', (req, res) => deliveryLocationController.updateLocationStatus(req, res));
router.delete('/admin/delivery-locations/:id', (req, res) => deliveryLocationController.deleteLocation(req, res));

export default router;
