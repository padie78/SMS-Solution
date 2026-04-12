export const persistTransaction = async (record) => {
    const { PK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    // 1. OBTENER EL RANGO (Prioridad IA para el periodo de consumo)
    const startDate = new Date(analytics_dimensions?.period_start || extracted_data?.invoice_date);
    const endDate = new Date(analytics_dimensions?.period_end || extracted_data?.invoice_date);
    
    // Si no hay rango válido, fallamos a un solo día (la fecha de factura)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Rango de fechas inválido");
        return { success: false };
    }

    // 2. CALCULAR DÍAS TOTALES
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 3. CALCULAR MÉTRICAS DIARIAS (Prorrateo)
    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.co2e) || 0) / totalDays,
        nSpend: (Number(extracted_data?.total_amount) || 0) / totalDays,
        vCons: (Number(ai_analysis?.value) || 0) / totalDays,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 4. GENERAR OPERACIONES PARA CADA DÍA DEL RANGO
    let allStatsOps = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const quarter = Math.ceil(month / 3);
        
        // Función getWeek (la misma que ya usas)
        const getWeek = (d) => {
            const target = new Date(d);
            const dayNr = (target.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
            return 1 + Math.ceil((firstThursday - target) / 604800000);
        };

        const timeData = { year, quarter, month, week: getWeek(currentDate), day };
        
        // Generamos los targets (Año, Mes, Día, etc.) para este día específico
        const opsForThisDay = buildStatsOps(PK, timeData, dailyMetrics, isoNow, totalDays);
        allStatsOps.push(...opsForThisDay);

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 5. EJECUTAR TRANSACCIÓN (Ojo: DynamoDB tiene un límite de 100 items por transacción)
    // Si el rango es de muchos meses, habrá que fragmentar el array transactItems.
    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { ...record, processed_at: isoNow, total_days_prorated: totalDays },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...allStatsOps
    ];

    // ... try/catch y ddb.send igual que antes
};