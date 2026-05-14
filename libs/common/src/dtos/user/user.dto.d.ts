import { z } from 'zod';
export declare const UserDTOSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodString]>;
    email: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    /** Alias GraphQL `fullName` (AppSync setup); si falta `displayName`, puede usarse este. */
    fullName: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["ADMIN", "MANAGER", "VIEWER", "BRANCH_ADMIN"]>;
    scopeRegionId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    scopeBranchId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    language: z.ZodOptional<z.ZodEnum<["es"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}, {
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}>, {
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}, {
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}>;
export type UserDTO = z.infer<typeof UserDTOSchema>;
export declare const parseUserDTO: (input: unknown) => UserDTO;
export declare const safeParseUserDTO: (input: unknown) => z.SafeParseReturnType<{
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}, {
    email: string;
    id: string;
    role: "ADMIN" | "MANAGER" | "VIEWER" | "BRANCH_ADMIN";
    displayName?: string | undefined;
    fullName?: string | undefined;
    scopeRegionId?: string | undefined;
    scopeBranchId?: string | undefined;
    language?: "es" | undefined;
}>;
//# sourceMappingURL=user.dto.d.ts.map