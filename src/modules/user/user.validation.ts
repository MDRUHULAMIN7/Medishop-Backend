import { z } from 'zod';
import { USER_ADDRESS_ID_REGEX } from './user.constants';

const bdPhoneRegex = /^(\+88)?01[3-9]\d{8}$/;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, { message: 'Name must be at least 2 characters' }).optional(),
    email: z.string().trim().email({ message: 'Email must be valid' }).optional(),
    phone: z.string().trim().regex(bdPhoneRegex, { message: 'Phone must be a valid Bangladesh number' }).optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined || value.phone !== undefined, {
    message: 'At least one profile field is required',
  });

const addressShape = {
  label: z.string().trim().optional(),
  recipientName: z.string().trim().min(2, { message: 'Recipient name must be at least 2 characters' }),
  phone: z.string().trim().regex(bdPhoneRegex, { message: 'Phone must be a valid Bangladesh number' }),
  division: z.string().trim().optional(),
  district: z.string().trim().min(2, { message: 'District is required' }),
  thana: z.string().trim().min(2, { message: 'Thana is required' }),
  addressLine: z.string().trim().min(5, { message: 'Address line must be at least 5 characters' }),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object(addressShape);

export const updateAddressSchema = z
  .object({
    ...addressShape,
    recipientName: z.string().trim().min(2, { message: 'Recipient name must be at least 2 characters' }).optional(),
    phone: z.string().trim().regex(bdPhoneRegex, { message: 'Phone must be a valid Bangladesh number' }).optional(),
    district: z.string().trim().min(2, { message: 'District is required' }).optional(),
    thana: z.string().trim().min(2, { message: 'Thana is required' }).optional(),
    addressLine: z.string().trim().min(5, { message: 'Address line must be at least 5 characters' }).optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.recipientName !== undefined ||
      value.phone !== undefined ||
      value.division !== undefined ||
      value.district !== undefined ||
      value.thana !== undefined ||
      value.addressLine !== undefined ||
      value.postalCode !== undefined ||
      value.isDefault !== undefined,
    { message: 'At least one address field is required' }
  );

export const addressIdParamsSchema = z.object({
  addressId: z.string().regex(USER_ADDRESS_ID_REGEX, { message: 'addressId must be a valid Mongo ObjectId' }),
});
