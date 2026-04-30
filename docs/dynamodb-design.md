### Invoice Attribute Detail (DDB JSON)
- **PK**: `ORG#<id>` (uuid del tenant)
- **SK**: `INV#<uuid>`
- **extracted_data (Map)**: Contiene la verdad del OCR (Total, Tax, Invoice Date, CUPS).
- **ai_analysis (Map)**: Resultados de la clasificación semántica (Service Type, Unit, Value central).
- **climatiq_result (Map)**: Huella de carbono vinculada (CO2e, Activity ID).
- **analytics (Map)**: Flags de anomalías y confianza del proceso.
- **metadata (Map)**: Punteros a S3 y auditoría de procesamiento.