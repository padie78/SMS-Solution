import { z } from 'zod';

export const GeoCoordinatesDTOSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180)
});

export type GeoCoordinatesDTO = z.infer<typeof GeoCoordinatesDTOSchema>;
