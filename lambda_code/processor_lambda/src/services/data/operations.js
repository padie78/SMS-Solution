import { TABLE_NAME } from "./client.js";

// --- 1. OPERACIONES DE ESTADÍSTICAS (Agregaciones) ---
/**
 * Genera operaciones para actualizar estadísticas agregadas (Año, Trimestre, Mes).
 * Implementa el patrón "Pre-aggregated Reports" para máximo rendimiento en lectura.
 */
export const buildStatsOps = (PK, year, month, quarter, nCo2e, nSpend, isoNow) => {
    const amountCo2 = Number(nCo2e) || 0;
    const amountSpend = Number(nSpend) || 0;
    const mStr = month.toString().padStart(2, '0');

    const targets = [
        { 
            sk: `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${mStr}`, 
            type: 'MONTHLY',
            labels: { ":y": year, ":q": quarter, ":m": month },
            setters: "year_ref = :y, quarter_ref = :q, month_ref = :m"
        },
        { 
            sk: `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`, 
            type: 'QUARTERLY',
            labels: { ":y": year, ":q": quarter },
            setters: "year_ref = :y, quarter_ref = :q"
        },
        { 
            sk: `STATS#YEAR#${year}#TOTAL`, 
            type: 'ANNUAL',
            labels: { ":y": year },
            setters: "year_ref = :y"
        }
    ];

    return targets.map(({ sk, type, labels, setters }) => ({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: sk },
            // Eliminamos los saltos de línea innecesarios que a veces causan errores de parsing
            UpdateExpression: `SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, total_spend = if_not_exists(total_spend, :zero) + :nSpend, invoice_count = if_not_exists(invoice_count, :zero) + :one, stats_type = :sType, last_updated = :now, ${setters}`,
            ExpressionAttributeValues: {
                ":nCo2e": amountCo2,
                ":nSpend": amountSpend,
                ":one": 1,
                ":zero": 0,
                ":now": isoNow,
                ":sType": type,
                ...labels
            }
        }
    }));
};

// --- 2. OPERACIÓN DE VENDOR (Proveedores) ---
/**
 * Actualiza o crea el registro del proveedor (Vendor).
 * Mantiene acumulados de CO2, conteo de transacciones y normalización de nombre.
 */
export const buildVendorOp = (PK, taxId, vendorName, nCo2e, isoNow) => {
    // Limpieza básica del Tax ID para asegurar integridad en la Sort Key
    const normalizedTaxId = taxId?.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || "UNKNOWN";
    const amount = Number(nCo2e) || 0;

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `VENDOR#${normalizedTaxId}#INFO` },
            /**
             * 1. Sumamos la contribución de CO2.
             * 2. Incrementamos el contador de facturas (invoice_count).
             * 3. Protegemos el nombre original con if_not_exists.
             * 4. Registramos tax_id_display para mantener el formato original (con guiones si existieran).
             */
            UpdateExpression: `
                SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e,
                    invoice_count = if_not_exists(invoice_count, :zero) + :one,
                    vendor_name = if_not_exists(vendor_name, :vName),
                    tax_id_display = :taxDisplay,
                    last_active = :now,
                    updated_at = :now
            `,
            ExpressionAttributeValues: {
                ":nCo2e": amount,
                ":one": 1,
                ":vName": vendorName || "PROVEEDOR DESCONOCIDO",
                ":taxDisplay": taxId,
                ":zero": 0,
                ":now": isoNow
            }
        }
    };
};

// --- 3. OPERACIÓN DE INFRAESTRUCTURA (Branch & Assets) ---
/**
 * Actualiza la metadata de Sucursales y Activos.
 * Usa lógica Upsert (Update or Insert) para mantener la integridad de la infraestructura.
 */
export const buildInfrastructureOps = (PK, branchId, assetId, serviceType, isoNow) => {
    // Sanitización de IDs para evitar SKs malformados
    const bId = branchId?.toString().toUpperCase() || "MAIN";
    const aId = assetId?.toString().toUpperCase() || "GENERIC_ASSET";

    return [
        {
            // --- ACTUALIZACIÓN DE SUCURSAL ---
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `BRANCH#${bId}#INFO` },
                // Actualizamos la fecha y aseguramos que tenga un nombre si es nueva
                UpdateExpression: `
                    SET last_invoice_date = :now, 
                        branch_status = :active,
                        branch_name = if_not_exists(branch_name, :bName),
                        updated_at = :now
                `,
                ExpressionAttributeValues: { 
                    ":now": isoNow, 
                    ":active": "ACTIVE",
                    ":bName": `Sucursal ${bId}`
                }
            }
        },
        {
            // --- ACTUALIZACIÓN DE ACTIVO (Asset) ---
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `ASSET#${aId}#INFO` },
                // Registramos el tipo de servicio (ELEC, WATER, etc.) y fecha
                UpdateExpression: `
                    SET last_reading = :now, 
                        service_type = :svc,
                        asset_label = if_not_exists(asset_label, :aLabel),
                        is_active = :true,
                        updated_at = :now
                `,
                ExpressionAttributeValues: { 
                    ":now": isoNow, 
                    ":svc": serviceType || "UNKNOWN",
                    ":aLabel": `Activo ${aId}`,
                    ":true": true
                }
            }
        }
    ];
};

// --- 4. OPERACIÓN DE BUDGETS (Presupuestos de Carbono) ---
/**
 * Actualiza el consumo actual contra el presupuesto anual
 */
/**
 * Actualiza el consumo acumulado contra el presupuesto anual.
 * Incluye lógica de cálculo de porcentaje de uso y protección de datos.
 */
export const buildBudgetUpdateOp = (PK, year, nCo2e, isoNow) => {
    // Aseguramos que los valores numéricos sean válidos para evitar errores en DynamoDB
    const amount = Number(nCo2e) || 0;

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `BUDGET#YEAR#${year}` },
            // 1. Incrementamos el consumo
            // 2. Calculamos el uso relativo (si existe el límite)
            // 3. Registramos la fecha de la última factura procesada
            UpdateExpression: `
                SET current_consumption = if_not_exists(current_consumption, :zero) + :nCo2e,
                    last_sync = :now,
                    updated_at = :now,
                    year_label = :year
            `,
            ExpressionAttributeValues: {
                ":nCo2e": amount,
                ":zero": 0,
                ":now": isoNow,
                ":year": year.toString()
            },
            // Evita que la transacción falle si por algún motivo el registro 
            // de presupuesto fue borrado manualmente
            ReturnValues: "UPDATED_NEW"
        }
    };
};

// --- 5. OPERACIÓN DE GOALS (Metas de reducción) ---
/**
 * Actualiza el progreso de una meta (Goal) de sostenibilidad.
 * Permite trackear el acumulado y actualizar el estado de cumplimiento.
 */
export const buildGoalUpdateOp = (PK, goalId, nCo2e, isoNow) => {
    // Sanitización y normalización
    const amount = Number(nCo2e) || 0;
    const gId = goalId?.toString().toUpperCase() || "GENERAL";

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `GOAL#${gId}` },
            /**
             * SET:
             * - acumulado: Sumamos el CO2 procesado.
             * - last_contribution: Guardamos cuánto sumó esta factura específica.
             * - progress_check: Marca de tiempo para auditoría.
             */
            UpdateExpression: `
                SET current_progress = if_not_exists(current_progress, :zero) + :nCo2e,
                    last_contribution = :nCo2e,
                    last_update = :now,
                    updated_at = :now,
                    goal_status = if_not_exists(goal_status, :active)
            `,
            ExpressionAttributeValues: {
                ":nCo2e": amount,
                ":zero": 0,
                ":now": isoNow,
                ":active": "IN_PROGRESS"
            },
            // Usamos ReturnValues para que, si necesitamos disparar una notificación 
            // de "Meta Cumplida", tengamos los valores actualizados tras la transacción.
            ReturnValues: "UPDATED_NEW"
        }
    };
};

// --- 6. OPERACIÓN DE TELEMETRÍA (Sensores y Salud) ---
/**
 * Esta suele ser un Put directo porque es histórico, 
 * pero aquí generamos el registro para Asset Health
 */
/**
 * Actualiza el estado de salud y operatividad de un activo.
 * Útil para mantenimiento preventivo y alertas de eficiencia.
 */
export const buildAssetHealthOp = (PK, assetId, healthStatus, isoNow) => {
    const aId = assetId?.toString().toUpperCase() || "GENERIC_ASSET";
    const status = healthStatus || "OPERATIONAL";

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `ASSET#${aId}#HEALTH` },
            /**
             * SET:
             * - status: Estado actual (OPERATIONAL, WARNING, CRITICAL, DOWN).
             * - previous_status: Guardamos el estado anterior para detectar cambios.
             * - health_score: Un valor numérico (opcional) para gráficas de tendencia.
             * - history_log: Una lista compacta de los últimos estados (útil para el UI).
             */
            UpdateExpression: `
                SET current_status = :s,
                    previous_status = current_status,
                    last_check = :now,
                    updated_at = :now,
                    check_count = if_not_exists(check_count, :zero) + :one,
                    #logs = list_append(if_not_exists(#logs, :empty_list), :new_log)
            `,
            // Usamos nombres de atributos de expresión porque 'logs' puede ser palabra reservada
            ExpressionAttributeNames: {
                "#logs": "status_history"
            },
            ExpressionAttributeValues: {
                ":s": status,
                ":now": isoNow,
                ":one": 1,
                ":zero": 0,
                ":empty_list": [],
                ":new_log": [{
                    status: status,
                    at: isoNow
                }]
            }
        }
    };
};

/**
 * Genera un resumen ejecutivo de KPIs para el Dashboard
 */
export const buildKpiSummaryOp = (PK, data) => {
    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `KPI#GLOBAL#SUMMARY` },
            UpdateExpression: `
                SET carbon_intensity = :ci,
                    budget_burn_rate = :bbr,
                    health_index = :hi,
                    updated_at = :now
            `,
            ExpressionAttributeValues: {
                ":ci": data.totalCo2 / data.totalM2,
                ":bbr": (data.currentCons / data.budgetLimit) * 100,
                ":hi": data.healthyAssets / data.totalAssets,
                ":now": new Date().toISOString()
            }
        }
    };
};