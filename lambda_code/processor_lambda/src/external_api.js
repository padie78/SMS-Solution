const axios = require('axios');

/**
 * Calcula el CO2 equivalente llamando a un motor de emisiones externo.
 * @param {Object} datosFactura - { tipo: string, cantidad: number, unidad: string }
 */
exports.calcularEnApiExterna = async (datosFactura) => {
    const API_URL = process.env.EMISSIONS_API_URL;
    const API_KEY = process.env.EMISSIONS_API_KEY;

    // 1. Validación previa: Si no hay URL, no podemos seguir.
    if (!API_URL) {
        console.warn("Configuración faltante: EMISSIONS_API_URL no definida.");
        return 0; // O un valor estimado por defecto
    }

    try {
        console.log(`Calculando emisiones para: ${datosFactura.tipo} (${datosFactura.cantidad} ${datosFactura.unidad})`);

        const response = await axios.post(API_URL, {
            activity_type: datosFactura.tipo,
            usage: datosFactura.cantidad,
            units: datosFactura.unidad,
            country: "IL" // Hardcodeado para Israel según tu contexto
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            timeout: 8000 // 8 segundos máximo para no colgar la Lambda
        });

        // Retornamos el valor numérico del cálculo
        return response.data.co2_equivalent || 0;

    } catch (error) {
        // 2. Manejo de errores específico (HTTP Status Codes)
        if (error.response) {
            // La API respondió con un error (4xx o 5xx)
            console.error(`API Externa Error [${error.response.status}]:`, error.response.data);
        } else if (error.code === 'ECONNABORTED') {
            // Timeout alcanzado
            console.error("API Externa Timeout: La solicitud tardó demasiado.");
        } else {
            // Error de red o configuración
            console.error("API Externa Error de Red:", error.message);
        }

        // 3. Estrategia de Fallo: Devolvemos un valor centinela o lanzamos el error
        // para que el index.js lo capture y lo guarde en DynamoDB como error.
        throw new Error(`Cálculo Externo Fallido: ${error.message}`);
    }
};