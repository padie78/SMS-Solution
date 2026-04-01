const BASE_QUERIES = [
    { Text: "Nombre empresa emisora", Alias: "VENDOR_NAME" },
    { Text: "CIF NIF emisor", Alias: "VENDOR_TAX_ID" },
    { Text: "CIF NIF DNI cliente", Alias: "CUSTOMER_NIF" },
    { Text: "Numero factura", Alias: "INVOICE_ID" },
    { Text: "Importe total", Alias: "TOTAL_AMOUNT" },
    { Text: "Base imponible", Alias: "NET_AMOUNT" },
    { Text: "Fecha emision", Alias: "INVOICE_DATE" },
    { Text: "Fecha inicio despues de Del", Alias: "PERIOD_START" },
    { Text: "Fecha fin despues de al", Alias: "PERIOD_END" },
    { Text: "Codigo postal", Alias: "POSTAL_CODE" }
];

export const QUERIES_BY_CATEGORY = {
    ELEC: [
        ...BASE_QUERIES,
        { Text: "Codigo CUPS", Alias: "CUPS" },
        { Text: "Consumo total kWh", Alias: "KWH_CONSUMPTION" }
    ],
    GAS: [
        ...BASE_QUERIES,
        { Text: "Codigo CUPS GAS", Alias: "SUPPLY_ID" },
        { Text: "Consumo m3", Alias: "VALUE" }
    ],
    WATER: [
        ...BASE_QUERIES,
        { Text: "Consumo m3", Alias: "VALUE" }
    ],
    WASTE: [
        ...BASE_QUERIES,
        { Text: "Tipo residuo", Alias: "WASTE_TYPE" },
        { Text: "Peso total", Alias: "VALUE" }
    ],
    LOGISTICS: [
        ...BASE_QUERIES,
        { Text: "Matricula vehiculo", Alias: "VEHICLE_ID" },
        { Text: "Distancia km", Alias: "DISTANCE" }
    ],
    STATIONARY_COMBUSTION: [
        ...BASE_QUERIES,
        { Text: "Tipo combustible", Alias: "FUEL_TYPE" },
        { Text: "Cantidad litros", Alias: "VALUE" }
    ],
    REFRIGERANTS: [
        ...BASE_QUERIES,
        { Text: "Gas refrigerante", Alias: "GAS_TYPE" },
        { Text: "Cantidad kg", Alias: "VALUE" }
    ],
    FLIGHTS: [
        ...BASE_QUERIES,
        { Text: "Ruta origen destino", Alias: "ROUTE" },
        { Text: "Clase viaje", Alias: "TRAVEL_CLASS" }
    ],
    OTHERS: [...BASE_QUERIES]
};

export default { QUERIES_BY_CATEGORY };