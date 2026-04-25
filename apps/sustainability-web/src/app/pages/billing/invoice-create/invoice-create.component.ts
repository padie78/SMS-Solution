export class InvoiceCreateComponent {
  private stateService = inject(InvoiceStateService);

  stepper = {
    currentStepIndex: 0 // p-stepper usa base 0 (0, 1, 2)
  };

  isLoadingIA: boolean = false;
  extractedInvoiceData: any = null;

  async handleStep1Complete(nextCallback: Function) {
    this.isLoadingIA = true;
    
    try {
      // Simulación de API call a tu backend de IA
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const aiResponse = {
        total: 1450.75,
        date: '2026-04-20',
        vendor: 'ENERGIA GLOBAL S.A.',
        consumption: 520.5
      };

      this.stateService.setAiData(aiResponse);
      this.extractedInvoiceData = aiResponse;

      this.isLoadingIA = false;
      nextCallback(); // Avanzamos al Paso 2 una vez tenemos los datos
      
    } catch (error) {
      this.isLoadingIA = false;
      console.error("Error IA:", error);
    }
  }

  async handleFinalConfirm(confirmedData: any, nextCallback: Function) {
    this.isLoadingIA = true;
    
    try {
      // Sincronización con DynamoDB
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.isLoadingIA = false;
      nextCallback(); // Avanzamos al Paso 3 (Éxito)
    } catch (error) {
      this.isLoadingIA = false;
    }
  }

  handleBack(prevCallback: Function) {
    prevCallback();
  }

  resetProcess() {
    this.stateService.clear();
    this.stepper.currentStepIndex = 0;
    this.extractedInvoiceData = null;
  }
}