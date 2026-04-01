const BASE_QUERIES = [
    // --- AUDITORÍA FINANCIERA Y FISCAL ---
    { Text: "Nombre empresa emisora", Alias: "VENDOR_NAME" },
    { Text: "CIF NIF emisor vendedor", Alias: "VENDOR_TAX_ID" },
    { Text: "DNI NIF NIE cliente receptor", Alias: "CUSTOMER_NIF" },
    { Text: "Numero de Factura", Alias: "INVOICE_ID" },
    { Text: "Total factura importe total", Alias: "TOTAL_AMOUNT" },
    { Text: "Base imponible", Alias: "NET_AMOUNT" },
    { Text: "Moneda simbolo Euro", Alias: "CURRENCY" },

    // --- TEMPORALIDAD Y GEOGRAFÍA ---
    { Text: "Fecha de Emision factura", Alias: "INVOICE_DATE" },
    { Text: "Fecha inicio despues de Del", Alias: "PERIOD_START" },
    { Text: "Fecha fin despues de al", Alias: "PERIOD_END" },
    { Text: "Codigo Postal CP", Alias: "POSTAL_CODE" },
    { Text: "Pais", Alias: "COUNTRY" }
];

export const QUERIES_BY_CATEGORY = {
    ELEC: [
        ...BASE_QUERIES,
        { Text: "Consumo total kWh", Alias: "KWH_CONSUMPTION" },
        { Text: "Codigo CUPS", Alias: "CUPS" }
    ],
    GAS: [
        ...BASE_QUERIES,
        { Text: "CUPS punto suministro GAS", Alias: "SUPPLY_ID" },
        { Text: "Consumo gas m3", Alias: "VALUE" },
        { Text: "Poder Calorifico Superior PCS", Alias: "TECH_FACTOR" }
    ],
    WASTE: [
        ...BASE_QUERIES,
        { Text: "Tipo residuo papel plastico organico", Alias: "WASTE_TYPE" },
        { Text: "Peso total kg toneladas", Alias: "VALUE" },
        { Text: "Metodo tratamiento reciclaje vertedero", Alias: "TREATMENT_METHOD" }
    ],
    STATIONARY_COMBUSTION: [
        ...BASE_QUERIES,
        { Text: "Tipo combustible diesel gasoleo propano", Alias: "FUEL_TYPE" },
        { Text: "Cantidad litros kg", Alias: "VALUE" }
    ],
    REFRIGERANTS: [
        ...BASE_QUERIES,
        { Text: "Gas refrigerante R410A R134a R32", Alias: "GAS_TYPE" },
        { Text: "Cantidad gas cargada kg", Alias: "VALUE" }
    ],
    FLIGHTS: [
        ...BASE_QUERIES,
        { Text: "Origen y destino vuelo IATA", Alias: "ROUTE" },
        { Text: "Clase viaje Economy Business First", Alias: "TRAVEL_CLASS" }
    ],
    OTHERS: [...BASE_QUERIES]
};

export default { QUERIES_BY_CATEGORY };