const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

exports.persistTransaction = async (record) => {
    const { PK, analytics_dims, metrics } = record;
    const statsSK = `STATS#${analytics_dims.year}#FACILITY#${analytics_dims.facility_id}`;

    return await ddb.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: process.env.DYNAMO_TABLE,
                    Item: record,
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            },
            {
                Update: {
                    TableName: process.env.DYNAMO_TABLE,
                    Key: { PK, SK: statsSK },
                    UpdateExpression: `
                        SET actuals_ytd.total_co2e = if_not_exists(actuals_ytd.total_co2e, :z) + :co2,
                            actuals_ytd.total_cost = if_not_exists(actuals_ytd.total_cost, :z) + :cost,
                            actuals_ytd.count_invoices = if_not_exists(actuals_ytd.count_invoices, :z) + :one,
                            monthly_history.#m = if_not_exists(monthly_history.#m, :empty_m)
                        SET monthly_history.#m.co2 = monthly_history.#m.co2 + :co2,
                            monthly_history.#m.cost = monthly_history.#m.cost + :cost
                    `,
                    ExpressionAttributeNames: { "#m": analytics_dims.month },
                    ExpressionAttributeValues: {
                        ":co2": metrics.co2e_tons,
                        ":cost": metrics.consumption_value,
                        ":one": 1, ":z": 0,
                        ":empty_m": { co2: 0, cost: 0 }
                    }
                }
            }
        ]
    }));
};