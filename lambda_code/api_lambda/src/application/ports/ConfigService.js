/**
 * Port: Config/CRUD service (outbound dependency).
 * Definición de la interfaz lógica para el sistema SMS.
 * 
 * @typedef {Object} ConfigService
 * 
 * -- GESTIÓN DE INFRAESTRUCTURA (Polimórfica) --
 * @property {(orgId: string, input: any) => Promise<any>} createNode - Crea Branch, Building, Meter, Asset, etc.
 * @property {(orgId: string, sk: string, input: any) => Promise<any>} updateNode - Actualiza campos específicos de un nodo.
 * @property {(orgId: string, sk: string) => Promise<any>} removeNode - Elimina un nodo de la jerarquía.
 * @property {(orgId: string, filter: any) => Promise<any[]>} getInfrastructureTree - Lista nodos por path o tipo.
 * 
 * -- ENTIDADES ESPECIALES --
 * @property {(orgId: string, input: any) => Promise<any>} saveOrgConfig - Configuración raíz de la organización.
 * @property {(orgId: string, input: any) => Promise<any>} saveCostCenter - Gestión de centros de costo y prorrateo.
 * @property {(orgId: string, userId: string, input: any) => Promise<any>} saveUser - Gestión de usuarios y permisos.
 * 
 * -- PROCESAMIENTO E INTELIGENCIA --
 * @property {(orgId: string, fileName: string, bucket: string) => Promise<any>} processInvoiceIA - Extracción de datos con IA.
 * @property {(orgId: string, sk: string, input: any) => Promise<any>} confirmInvoice - Validación de facturas procesadas.
 * 
 * -- OTROS --
 * @property {(input: any) => Promise<any>} saveEmissionFactor - Factores de emisión globales.
 * @property {(orgId: string, branchId: string, period: string, input: any) => Promise<any>} saveProductionLog - Logs de actividad.
 */

export {};

