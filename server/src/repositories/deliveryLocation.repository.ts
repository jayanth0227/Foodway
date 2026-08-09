import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, deliveryLocationsTableName } from '../config/aws';
import { IDeliveryLocation, CreateDeliveryLocationDTO, UpdateDeliveryLocationDTO, DeliveryLocationStatus } from '../types/deliveryLocation.types';

const INITIAL_SEED_LOCATIONS: IDeliveryLocation[] = [
  {
    locationId: 'loc-eethakota',
    name: 'Eethakota',
    region: 'Ravulapalem',
    pincode: '533238',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-10T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-10T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-deverapalli',
    name: 'Deverapalli',
    region: 'Ravulapalem',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-11T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-11T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-jonnada',
    name: 'Jonnada',
    region: 'Alamuru',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-12T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-12T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-mandapeta',
    name: 'Mandapeta',
    region: 'Mandapeta',
    pincode: '533308',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-13T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-13T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-gopalapuram',
    name: 'Gopalapuram',
    region: 'Ravulapalem',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-14T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-14T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-ganti',
    name: 'Ganti',
    region: 'Kothapeta',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-15T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-15T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-kommarajulanka',
    name: 'Kommarajulanka',
    region: 'Ravulapalem',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-16T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-16T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-ryali',
    name: 'Ryali',
    region: 'Atreyapuram',
    pincode: '533236',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-17T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-17T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-ubalanka',
    name: 'Ubalanka',
    region: 'Ravulapalem',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-18T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-18T10:00:00.000Z').toISOString(),
  },
  {
    locationId: 'loc-vadapalli',
    name: 'Vadapalli',
    region: 'Atreyapuram',
    pincode: '533237',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-19T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-19T10:00:00.000Z').toISOString(),
  },
];

export class DeliveryLocationRepository {
  private inMemoryLocations: IDeliveryLocation[] = [...INITIAL_SEED_LOCATIONS];

  async findAll(): Promise<IDeliveryLocation[]> {
    try {
      const command = new ScanCommand({ TableName: deliveryLocationsTableName });
      const response = await dynamoDocClient.send(command);
      if (response && Array.isArray(response.Items) && response.Items.length > 0) {
        return response.Items as IDeliveryLocation[];
      }
    } catch (error) {
      console.warn('DynamoDB scan failed or table does not exist, using in-memory store:', (error as Error).message);
    }
    return Array.isArray(this.inMemoryLocations) ? this.inMemoryLocations : [];
  }

  async findActiveOnly(): Promise<IDeliveryLocation[]> {
    const all = await this.findAll();
    if (!Array.isArray(all)) return [];
    return all.filter((loc) => loc && loc.status === 'ACTIVE');
  }

  async findById(locationId: string): Promise<IDeliveryLocation | null> {
    if (!locationId) return null;
    try {
      const command = new GetCommand({
        TableName: deliveryLocationsTableName,
        Key: { locationId },
      });
      const response = await dynamoDocClient.send(command);
      if (response && response.Item) {
        return response.Item as IDeliveryLocation;
      }
    } catch (error) {
      console.warn(`DynamoDB get failed for ${locationId}, using in-memory store:`, (error as Error).message);
    }
    return (
      (Array.isArray(this.inMemoryLocations) &&
        this.inMemoryLocations.find((loc) => loc && loc.locationId === locationId)) ||
      null
    );
  }

  async create(dto: CreateDeliveryLocationDTO): Promise<IDeliveryLocation> {
    const now = new Date().toISOString();
    const newLocation: IDeliveryLocation = {
      locationId: `loc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: dto.name ? String(dto.name).trim() : '',
      region: dto.region ? String(dto.region).trim() : '',
      pincode: dto.pincode ? String(dto.pincode).trim() : undefined,
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: dto.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    // Store in DynamoDB
    try {
      const command = new PutCommand({
        TableName: deliveryLocationsTableName,
        Item: newLocation,
      });
      await dynamoDocClient.send(command);
    } catch (error) {
      console.warn('DynamoDB put failed, updated in-memory store:', (error as Error).message);
    }

    // Keep in-memory in sync
    if (!Array.isArray(this.inMemoryLocations)) {
      this.inMemoryLocations = [];
    }
    this.inMemoryLocations.unshift(newLocation);
    return newLocation;
  }

  async update(locationId: string, dto: UpdateDeliveryLocationDTO): Promise<IDeliveryLocation | null> {
    const existing = await this.findById(locationId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedLocation: IDeliveryLocation = {
      ...existing,
      name: dto.name !== undefined ? (dto.name ? String(dto.name).trim() : '') : existing.name,
      region: dto.region !== undefined ? (dto.region ? String(dto.region).trim() : '') : existing.region,
      pincode: dto.pincode !== undefined ? (dto.pincode ? String(dto.pincode).trim() : undefined) : existing.pincode,
      latitude: dto.latitude !== undefined ? dto.latitude : existing.latitude,
      longitude: dto.longitude !== undefined ? dto.longitude : existing.longitude,
      status: dto.status !== undefined ? dto.status : existing.status,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: deliveryLocationsTableName,
        Item: updatedLocation,
      });
      await dynamoDocClient.send(command);
    } catch (error) {
      console.warn('DynamoDB update failed, updated in-memory store:', (error as Error).message);
    }

    if (!Array.isArray(this.inMemoryLocations)) {
      this.inMemoryLocations = [];
    }
    const idx = this.inMemoryLocations.findIndex((l) => l && l.locationId === locationId);
    if (idx !== -1) {
      this.inMemoryLocations[idx] = updatedLocation;
    } else {
      this.inMemoryLocations.unshift(updatedLocation);
    }

    return updatedLocation;
  }

  async updateStatus(locationId: string, status: DeliveryLocationStatus): Promise<IDeliveryLocation | null> {
    return this.update(locationId, { status });
  }

  async delete(locationId: string): Promise<boolean> {
    if (!locationId) return false;
    try {
      const command = new DeleteCommand({
        TableName: deliveryLocationsTableName,
        Key: { locationId },
      });
      await dynamoDocClient.send(command);
    } catch (error) {
      console.warn(`DynamoDB delete failed for ${locationId}, updated in-memory store:`, (error as Error).message);
    }

    if (!Array.isArray(this.inMemoryLocations)) {
      this.inMemoryLocations = [];
      return true;
    }
    const initialLength = this.inMemoryLocations.length;
    this.inMemoryLocations = this.inMemoryLocations.filter((l) => l && l.locationId !== locationId);
    return this.inMemoryLocations.length < initialLength;
  }
}

export const deliveryLocationRepository = new DeliveryLocationRepository();
export default deliveryLocationRepository;
