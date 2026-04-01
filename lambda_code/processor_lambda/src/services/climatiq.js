const { STRATEGIES } = require("../constants/climatiq_catalog");

exports.calculateFootprint = async (lines) => {
    let totalKg = 0;
    const items = [];

    for (const line of lines) {
        const strategy = STRATEGIES[line.strategy];
        if (!strategy) continue;

        const res = await fetch("https://api.climatiq.io/data/v1/estimate", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${process.env.CLIMATIQ_API_KEY}`,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                emission_factor: { activity_id: strategy.activity_id },
                parameters: { [strategy.unit_type]: line.value, [`${strategy.unit_type}_unit`]: line.unit }
            })
        });
        const data = await res.json();
        const co2 = data.co2e || 0;
        totalKg += co2;
        items.push({ ...line, co2e_kg: co2 });
    }

    return { total_tons: totalKg / 1000, items };
};