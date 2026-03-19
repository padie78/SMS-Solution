const axios = require('axios'); // Asegurate de tener axios en tu package.json

async function calcularEnApiExterna(datosFactura) {
    const API_URL = process.env.EXTERNAL_CALC_API_URL;
    const API_KEY = process.env.EXTERNAL_API_KEY;

    try {
        const response = await axios.post(API_URL, {
            value: datosFactura.cantidad,
            unit: datosFactura.unidad,
            activity: datosFactura.tipo_energia
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        return {
            valor: response.data.co2_equivalent,
            audit_id: response.data.id
        };
    } catch (error) {
        console.error("Error llamando a la API de cálculo:", error.message);
        // Fallback: Si la API falla, devolvemos un objeto para que la Lambda no rompa
        throw new Error("El motor de cálculo externo no respondió.");
    }
}

module.exports = { calcularEnApiExterna };