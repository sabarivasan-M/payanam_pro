import { z } from 'zod';

const money = (label: string, min = 0) => z.number({ error: `Enter ${label}` }).min(min, `${label} must be at least ₹${min}`);

export const bikeFormSchema = z
  .object({
    brand: z.string().trim().min(2, 'Enter the brand'),
    model: z.string().trim().min(1, 'Enter the model'),
    year: z.number({ error: 'Enter the year' }).int().min(2005, 'Bikes older than 2005 are not accepted').max(new Date().getFullYear(), 'Year cannot be in the future'),
    registrationNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/, 'Use the format TN 09 AB 1234'),
    bikeType: z.enum(['scooter', 'commuter', 'sports', 'cruiser', 'electric']),
    fuelType: z.enum(['petrol', 'electric']),
    transmission: z.enum(['automatic', 'manual']),
    engineCc: z.number({ error: 'Enter engine cc (0 for electric)' }).min(0).max(2000),
    mileageKmpl: z.number({ error: 'Enter mileage' }).min(1, 'Enter mileage').max(300),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour'),
    seatingCapacity: z.number({ error: 'Enter seats' }).int().min(1).max(3),
    condition: z.enum(['excellent', 'good', 'fair']),
    dailyPrice: money('Daily price', 100),
    hourlyPrice: money('Hourly price', 20),
    includedKmPerDay: z.number({ error: 'Enter included km' }).int().min(10, 'Include at least 10 km').max(500),
    extraKmRate: money('Extra km price', 1),
    extraMinuteRate: money('Extra minute price', 0),
    securityDeposit: money('Security deposit', 0),
    forSale: z.boolean(),
    purchasePrice: z.number().min(1000, 'Enter a valid sale price').nullable().optional(),
    pickupAddressId: z.string().min(1, 'Choose a pickup location'),
  })
  .refine((v) => !v.forSale || (v.purchasePrice ?? 0) >= 1000, { path: ['purchasePrice'], message: 'Enter the sale price' })
  .refine((v) => v.hourlyPrice < v.dailyPrice, { path: ['hourlyPrice'], message: 'Hourly price should be less than the daily price' });

export type BikeForm = z.infer<typeof bikeFormSchema>;

export const BIKE_COLORS = ['#C0392B', '#E67E22', '#F4D03F', '#1F2A33', '#34495E', '#2E6DB4', '#1A4E8A', '#0E6B5C', '#7F8C8D', '#ECF0F1'];
