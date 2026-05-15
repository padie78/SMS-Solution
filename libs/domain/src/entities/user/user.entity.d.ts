import type { UserRole } from '@sms/common';
import type { UserLanguage } from '@sms/common';
import type { UserDTO } from '@sms/common';
/** Usuario workspace — alcance regional o por sucursal (RBAC). */
export declare class UserEntity {
    readonly id: string;
    readonly email: string;
    readonly role: UserRole;
    readonly scopeRegionId?: string | undefined;
    readonly scopeBranchId?: string | undefined;
    readonly displayName?: string | undefined;
    readonly fullName?: string | undefined;
    readonly language?: UserLanguage | undefined;
    constructor(id: string, email: string, role: UserRole, scopeRegionId?: string | undefined, scopeBranchId?: string | undefined, displayName?: string | undefined, fullName?: string | undefined, language?: UserLanguage | undefined);
    static fromDTO(dto: UserDTO): UserEntity;
    assertScopeIntegrity(): void;
    isGlobalAdminScope(): boolean;
    toValue(): UserDTO;
}
//# sourceMappingURL=user.entity.d.ts.map