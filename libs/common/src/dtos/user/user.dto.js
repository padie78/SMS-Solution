import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { UserRoleSchema } from '../shared/domain-enums.js';
import { UserLanguageSchema } from '../shared/graphql-setup-enums.js';
export const UserDTOSchema = z
    .object({
    id: SmsIdSchema,
    email: z.string().email(),
    displayName: z.string().min(1).optional(),
    /** Alias GraphQL `fullName` (AppSync setup); si falta `displayName`, puede usarse este. */
    fullName: z.string().min(1).optional(),
    role: UserRoleSchema,
    scopeRegionId: SmsIdSchema.optional(),
    scopeBranchId: SmsIdSchema.optional(),
    language: UserLanguageSchema.optional()
})
    .superRefine((data, ctx) => {
    if (data.scopeRegionId && data.scopeBranchId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'User scope must be either scopeRegionId or scopeBranchId, not both'
        });
    }
    const needsScope = data.role !== 'ADMIN';
    if (needsScope && !data.scopeRegionId && !data.scopeBranchId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Non-ADMIN roles require scopeRegionId or scopeBranchId'
        });
    }
});
export const parseUserDTO = (input) => UserDTOSchema.parse(input);
export const safeParseUserDTO = (input) => UserDTOSchema.safeParse(input);
//# sourceMappingURL=user.dto.js.map