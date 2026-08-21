import { Request, Response } from 'express';
import deliveryLocationRepository from '../repositories/deliveryLocation.repository';
import { CreateDeliveryLocationDTO, UpdateDeliveryLocationDTO, DeliveryLocationStatus } from '../types/deliveryLocation.types';
import socketService from '../services/socket.service';

export class DeliveryLocationController {
  // GET /api/delivery-locations (Public user home page endpoint)
  async getPublicLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await deliveryLocationRepository.findActiveOnly();
      const safeLocations = Array.isArray(locations) ? locations : [];
      res.json({
        success: true,
        count: safeLocations.length,
        locations: safeLocations,
      });
    } catch (error) {
      console.error('Error fetching public delivery locations:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to load delivery locations.',
        error: (error as Error).message,
      });
    }
  }

  // GET /api/admin/delivery-locations (Admin panel endpoint)
  async getAdminLocations(req: Request, res: Response): Promise<void> {
    try {
      let locations = await deliveryLocationRepository.findAll();
      if (!Array.isArray(locations)) {
        locations = [];
      }

      // Search & status filtering
      const { search, status, region } = req.query;

      if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
        locations = locations.filter((l) => l && l.status === status);
      }

      if (region && typeof region === 'string' && region.trim() !== '') {
        const regionQuery = region.trim().toLowerCase();
        locations = locations.filter(
          (l) => l && l.region && String(l.region).toLowerCase().includes(regionQuery)
        );
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const query = search.trim().toLowerCase();
        locations = locations.filter(
          (l) =>
            (l && l.name && String(l.name).toLowerCase().includes(query)) ||
            (l && l.region && String(l.region).toLowerCase().includes(query)) ||
            (l && l.pincode && String(l.pincode).toLowerCase().includes(query))
        );
      }

      res.json({
        success: true,
        count: locations.length,
        locations,
      });
    } catch (error) {
      console.error('Error fetching admin delivery locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch delivery locations.',
        error: (error as Error).message,
      });
    }
  }

  // GET /api/admin/delivery-locations/:id
  async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Location ID parameter is required.' });
        return;
      }
      const location = await deliveryLocationRepository.findById(id);
      if (!location) {
        res.status(404).json({
          success: false,
          message: `Delivery location with ID '${id}' not found.`,
        });
        return;
      }
      res.json({
        success: true,
        location,
      });
    } catch (error) {
      console.error('Error fetching location by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch location details.',
        error: (error as Error).message,
      });
    }
  }

  // POST /api/admin/delivery-locations
  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const { name, region, pincode, latitude, longitude, status } = req.body || {};

      if (!name || String(name).trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Location Name is required.',
        });
        return;
      }

      if (!region || String(region).trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Region / Area is required.',
        });
        return;
      }

      const dto: CreateDeliveryLocationDTO = {
        name: String(name).trim(),
        region: String(region).trim(),
        pincode: pincode ? String(pincode).trim() : undefined,
        latitude: latitude !== undefined && latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : undefined,
        longitude: longitude !== undefined && longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : undefined,
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      };

      const created = await deliveryLocationRepository.create(dto);
      if (socketService) socketService.emitLocationUpdated(created);

      res.status(201).json({
        success: true,
        message: `${created.name} location created successfully.`,
        location: created,
      });
    } catch (error) {
      console.error('Error creating delivery location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create delivery location.',
        error: (error as Error).message,
      });
    }
  }

  // PUT /api/admin/delivery-locations/:id
  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Location ID parameter is required.' });
        return;
      }

      const { name, region, pincode, latitude, longitude, status } = req.body || {};

      const dto: UpdateDeliveryLocationDTO = {
        name: name !== undefined ? String(name).trim() : undefined,
        region: region !== undefined ? String(region).trim() : undefined,
        pincode: pincode !== undefined ? (pincode ? String(pincode).trim() : undefined) : undefined,
        latitude: latitude !== undefined && latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : undefined,
        longitude: longitude !== undefined && longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : undefined,
        status: status === 'INACTIVE' ? 'INACTIVE' : status === 'ACTIVE' ? 'ACTIVE' : undefined,
      };

      const updated = await deliveryLocationRepository.update(id, dto);

      if (!updated) {
        res.status(404).json({
          success: false,
          message: `Delivery location with ID '${id}' not found.`,
        });
        return;
      }

      if (socketService) socketService.emitLocationUpdated(updated);

      res.json({
        success: true,
        message: `${updated.name} location updated successfully.`,
        location: updated,
      });
    } catch (error) {
      console.error('Error updating delivery location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update delivery location.',
        error: (error as Error).message,
      });
    }
  }

  // PATCH /api/admin/delivery-locations/:id/status
  async updateLocationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Location ID parameter is required.' });
        return;
      }

      const { status } = req.body || {};

      if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
        res.status(400).json({
          success: false,
          message: "Status must be either 'ACTIVE' or 'INACTIVE'.",
        });
        return;
      }

      const updated = await deliveryLocationRepository.updateStatus(id, status as DeliveryLocationStatus);

      if (!updated) {
        res.status(404).json({
          success: false,
          message: `Delivery location with ID '${id}' not found.`,
        });
        return;
      }

      if (socketService) socketService.emitLocationUpdated(updated);

      res.json({
        success: true,
        message: `${updated.name} is now ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.`,
        location: updated,
      });
    } catch (error) {
      console.error('Error toggling delivery location status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location status.',
        error: (error as Error).message,
      });
    }
  }

  // DELETE /api/admin/delivery-locations/:id
  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Location ID parameter is required.' });
        return;
      }

      const existing = await deliveryLocationRepository.findById(id);

      if (!existing) {
        res.status(404).json({
          success: false,
          message: `Delivery location with ID '${id}' not found.`,
        });
        return;
      }

      await deliveryLocationRepository.delete(id);
      if (socketService) socketService.emitLocationUpdated({ locationId: id, deleted: true });

      res.json({
        success: true,
        message: `${existing.name} location deleted successfully.`,
        locationId: id,
      });
    } catch (error) {
      console.error('Error deleting delivery location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete delivery location.',
        error: (error as Error).message,
      });
    }
  }
}

export const deliveryLocationController = new DeliveryLocationController();
export default deliveryLocationController;
