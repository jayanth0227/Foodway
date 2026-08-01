import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName } from '../config/aws';
import { restaurantService, RestaurantService } from '../services/restaurant.service';

export class RestaurantController {
  private service: RestaurantService;

  constructor(service: RestaurantService = restaurantService) {
    this.service = service;
  }

  getStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { restaurantId } = req.params;
      const result = await this.service.getStatus(restaurantId);
      return res.json(result);
    } catch (error: any) {
      console.error('[RestaurantController] Error fetching status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurant status.',
        details: error.message
      });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { restaurantId } = req.params;
      const { isOpen } = req.body;
      const result = await this.service.updateStatus(restaurantId, isOpen);
      return res.json(result);
    } catch (error: any) {
      console.error('[RestaurantController] Error updating status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update restaurant status.',
        details: error.message
      });
    }
  };

  getSettings = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { restaurantId } = req.params;
      const result = await this.service.getSettings(restaurantId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to fetch settings.', details: error.message });
    }
  };

  updateSettings = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { restaurantId } = req.params;
      const settings = req.body;
      const result = await this.service.updateSettings(restaurantId, settings);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to update settings.', details: error.message });
    }
  };

  updateAvailability = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { itemId } = req.params;
      const { isAvailable } = req.body;
      const result = await this.service.updateAvailability(itemId, !!isAvailable);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to update availability.', details: error.message });
    }
  };

  uploadMedia = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { fileName, fileType, fileData } = req.body;
      if (!fileName || !fileType || !fileData) {
        return res.status(400).json({ success: false, error: 'Missing required media parameters.' });
      }

      if (bucketName) {
        const base64Data = fileData.replace(/^data:(image|video)\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const uniqueFileName = `uploads/${Date.now()}_${fileName}`;
        const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: uniqueFileName,
          Body: buffer,
          ContentType: fileType,
        });

        await s3Client.send(command);
        const fileUrl = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${uniqueFileName}`;
        return res.json({ success: true, message: 'Media uploaded successfully to S3.', fileUrl });
      }

      return res.json({ success: true, message: 'Media payload received (S3 bucket unconfigured).', fileUrl: fileData });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to upload media to S3.', details: error.message });
    }
  };
}

export const restaurantController = new RestaurantController();
