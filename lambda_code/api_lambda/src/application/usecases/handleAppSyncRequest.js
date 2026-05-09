import { ValidationError } from "../../domain/errors.js";

export class HandleAppSyncRequest {
  constructor(deps) {
    this.deps = deps;
  }

  async execute(params) {
    const { methodName, orgId, tenantId, holdingId, args } = params;
    
    // El holdingId suele ser el nivel más alto, perfecto para multi-tenancy.
    const orgScope = holdingId || orgId || tenantId;
    
    // Aseguramos que el input exista para no romper los servicios
    const input = args?.input || {};

    switch (methodName) {
      // --- INFRAESTRUCTURA POLIMÓRFICA ---
      
      case "saveNode":
        // Si el input trae un ID, podrías decidir si llamar a update o create
        // Pero nuestro createNode ya es inteligente (Upsert)
        return await this.deps.configService.createNode(orgScope, input);

      case "updateNode":
        // Agregamos este caso para usar la nueva lógica de Update dinámico
        if (!args.id) throw new ValidationError("El ID del nodo es requerido para actualizar");
        return await this.deps.configService.updateNode(orgScope, args.id, input);

      case "getNode":
        // Asegurate que en el service se llame getNode o similar
        // (En el paso anterior lo manejamos como db.getNode vía adaptador)
        return await this.deps.configServiceAdapter.getNode(orgScope, args.id);

      case "listNodes":
        // El filter suele traer { underPath, nodeType }
        return await this.deps.configService.getInfrastructureTree(orgScope, args.filter?.underPath);

      case "deleteNode":
        if (!args.id) throw new ValidationError("ID requerido para eliminar");
        return await this.deps.configService.deleteNode(orgScope, args.id);

      // --- ACCIONES DE NEGOCIO ---

      case "saveCostCenter":
        return await this.deps.configService.saveCostCenter(orgScope, input);

      case "processInvoice":
        if (!args.fileName) throw new ValidationError("fileName es requerido");
        return await this.deps.configService.processInvoiceIA(
          orgScope, 
          args.fileName, 
          this.deps.defaultBucket
        );

      default:
        throw new ValidationError(`Resolver "${methodName}" no implementado en el backend.`);
    }
  }
}