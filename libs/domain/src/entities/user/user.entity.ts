import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import type { UserRole } from '@sms/common';
import type { UserLanguage } from '@sms/common';
import type { UserDTO } from '@sms/common';

/** Usuario workspace — alcance regional o por sucursal (RBAC). */
export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly scopeRegionId?: string,
    public readonly scopeBranchId?: string,
    public readonly displayName?: string,
    public readonly fullName?: string,
    public readonly language?: UserLanguage
  ) {
    this.assertScopeIntegrity();
  }

  static fromDTO(dto: UserDTO): UserEntity {
    return new UserEntity(
      dto.id,
      dto.email,
      dto.role,
      dto.scopeRegionId,
      dto.scopeBranchId,
      dto.displayName,
      dto.fullName,
      dto.language
    );
  }

  assertScopeIntegrity(): void {
    if (!this.id?.trim()) throw new DomainInvariantError('User.id required');
    if (!this.email?.trim()) throw new DomainInvariantError('User.email required');
    if (this.scopeRegionId && this.scopeBranchId) {
      throw new DomainInvariantError('User cannot define both scopeRegionId and scopeBranchId');
    }
    if (this.role !== 'ADMIN' && !this.scopeRegionId && !this.scopeBranchId) {
      throw new DomainInvariantError(`Role ${this.role} requires scopeRegionId or scopeBranchId`);
    }
  }

  isGlobalAdminScope(): boolean {
    return this.role === 'ADMIN' && !this.scopeRegionId && !this.scopeBranchId;
  }

  toValue(): UserDTO {
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
