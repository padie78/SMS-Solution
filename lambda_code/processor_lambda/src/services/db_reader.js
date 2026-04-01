// services/db_reader.js
exports.getFacilityStats = async (orgId, year, facilityId) => {
    const params = {
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "PK = :pk AND SK = :sk",
        ExpressionAttributeValues: {
            ":pk": `ORG#${orgId}`,
            ":sk": `STATS#${year}#FACILITY#${facilityId}`
        }
    };
    return await ddb.send(new GetCommand(params));
};

exports.listInvoices = async (orgId, limit = 20) => {
    // Aquí usarías un GSI (Global Secondary Index) si querés filtrar por fecha
};