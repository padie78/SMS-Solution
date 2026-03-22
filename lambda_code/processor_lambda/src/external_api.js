/**
 * Usamos fetch nativo (disponible en Node.js 18+)
 * para evitar el manejo de node_modules en Lambda.
 */
async function calcularEnApiExterna(datosFactura) {
    // Si todavía no tenés la URL real, podés usar un mock para testear el flujo
const url = process.env.EMISSIONS_API_URL || "https://api.ejemplo.com/v1/calculate";
    
    console.log(`[EXTERNAL_API] Llamando a: ${url}`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.EMISSIONS_API_KEY || "dummy-key"
            },
            body: JSON.stringify({
                vendor: datosFactura.vendor,
                amount: datosFactura.totalAmount,
                date: datosFactura.date
            })
        });

        if (!response.ok) {
            console.error(`[EMISSIONS_API] Error: ${response.status}`);
            // Si la API falla, devolvemos un valor por defecto para no romper el flujo
            return 0.25; 
        }

        const data = await response.json();
        return data.co2e || 0.10; // Ajustá al campo real de tu API

    } catch (error) {
        console.error("[EMISSIONS_API] Exception:", error.message);
        return 0.15; // Fallback
    }
}

module.exports = { calcularEnApiExterna };