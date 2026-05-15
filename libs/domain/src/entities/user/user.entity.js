import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
/** Usuario workspace — alcance regional o por sucursal (RBAC). */
export class UserEntity {
    id;
    email;
    role;
    scopeRegionId;
    scopeBranchId;
    displayName;
    fullName;
    language;
    constructor(id, email, role, scopeRegionId, scopeBranchId, displayName, fullName, language) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.scopeRegionId = scopeRegionId;
        this.scopeBranchId = scopeBranchId;
        this.displayName = displayName;
        this.fullName = fullName;
        this.language = language;
        this.assertScopeIntegrity();
    }
    static fromDTO(dto) {
        return new UserEntity(dto.id, dto.email, dto.role, dto.scopeRegionId, dto.scopeBranchId, dto.displayName, dto.fullName, dto.language);
    }
    assertScopeIntegrity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('User.id required');
        if (!this.email?.trim())
            throw new DomainInvariantError('User.email required');
        if (this.scopeRegionId && this.scopeBranchId) {
            throw new DomainInvariantError('User cannot define both scopeRegionId and scopeBranchId');
        }
        if (this.role !== 'ADMIN' && !this.scopeRegionId && !this.scopeBranchId) {
            throw new DomainInvariantError(`Role ${this.role} requires scopeRegionId or scopeBranchId`);
        }
    }
    isGlobalAdminScope() {
        return this.role === 'ADMIN' && !this.scopeRegionId && !this.scopeBranchId;
    }
    toValue() {
        return {
            id: this.id,
            email: this.email,
            displayName: this.displayName,
            fullName: this.fullName,
            role: this.role,
            scopeRegionId: this.scopeRegionId,
            scopeBranchId: this.scopeBranchId,
            language: this.language
        };
    }
}
//# sourceMappingURL=user.entity.js.map