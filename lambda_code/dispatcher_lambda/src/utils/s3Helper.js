import { S3OrgResolverAws } from "../infrastructure/aws/S3OrgResolverAws.js";

const resolver = new S3OrgResolverAws();

export const getOrganizationId = async (bucket, key) => {
    return await resolver.resolveOrgId({ bucket, key, requestId: "legacy" });
};