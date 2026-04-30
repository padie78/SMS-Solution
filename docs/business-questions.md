1. Capa Descriptiva: "La Verdad Operativa"
Objetivo: Visibilidad histórica y transparencia técnica.
Procedimiento General: Ingesta de telemetría e facturas → Normalización de unidades → Agregación en tablas de estadísticas (STATS#MONTHLY).


#
Pregunta de Negocio
Alcance (Nivel de Filtro)
Atributo / Lógica DynamoDB
Procedimiento de Análisis (Cálculo Dinámico)
1
¿Consumo por Branch / Asset?
Jerárquico / Seleccionable
GSI en topology
Agregación dinámica basada en el PK de la rama y el rango de SK (rango de fechas).
2
¿Gasto monetario total?
Por Entidad / Mensual-Anual
SK INV#
Sumatoria de financials_total_spend filtrado por el atributo billing_period.
3
Benchmarking entre sedes
Comparativo (Cross-Branch)
energy_intensity
Normalización: kWh del periodo seleccionado / m2 de la ubicación física.
4
Desperdicio (Fugas)
Punto de Medición / Tiempo
metrology vs submeters
Balance de Masas: Diferencial entre medidores padre/hijo en el rango temporal elegido.
5
Energía Productiva vs Ociosa
Por Asset / Turno
operational_params
Ratio de logs en status: ACTIVE vs IDLE dentro del rango horario seleccionado.
6
Trazabilidad ESG / CO2
Por Org / Año Fiscal
factor_identity
kWh del periodo × factor_value vigente para esa región y fecha específica.
7
Salud de Red (Power Quality)
Por Tablero / Tiempo Real
metrology.harmonics
FFT para detectar distorsión armónica y desbalance en puntos críticos de la red.
8
Cumplimiento (Compliance)
Por Jurisdicción / Anual
regulatory_compliance
Monitor de umbrales legales específicos según la geolocalización de la sede.
9
Calidad del dato
Por Fuente / Periodo
audit_trail
Reliability Score: % de paquetes de telemetría exitosos en el intervalo elegido.
10
Consumo por Tipo de Sistema
Por Edificio / Periodo
systems_config
Agregación por categorías (HVAC, Iluminación) filtrada por Building_ID.
11
Intensidad de Carbono/Producto
Por Línea de Producción
ghg_total_co2e_kg
Emisiones del intervalo / Unidades reportadas en el production_log respectivo.
12
Eficiencia de Distribución
Por Topología Eléctrica
topology (Nodos P/H)
Grid Efficiency %: Comparativa de pérdidas técnicas entre niveles de la red interna.
13
Uso bajo Carga Nominal
Por Máquina / Turno
tech_specs
% de tiempo con carga eficiente (>70%) durante las horas de operación activa.
14
Consumos Fantasma
Por Sucursal / Horas Cierre
operational_params
Sumatoria de kWh cuando la ubicación o asset tiene status: CLOSED.
15
Costo por Metro Cuadrado
Por Edificio / Mes
physical_specs.m2
Gasto total de la ubicación / superficie operativa registrada en building_info.
16
Impacto de Variación Voltaje
Por Asset / Vida Útil
metrology.voltage
Conteo de eventos de calidad energética que degradan el lifecycle del activo.
17
Ahorro Realizado (Avoided Cost)
Por Proyecto / Acumulado
ai_analysis.savings
(Baseline - Real) × Tarifa para el periodo y ubicación seleccionados.
18
Costo de Procrastinación
Por Gerencia / Semanal
ai_analysis.pending
Σ Ahorro perdido por recomendaciones AI no ejecutadas en esa sede/periodo.
19
Brecha hacia Net Zero
Por Corporativo / Anual
sustainability_standards
Gap Analysis: % de avance hacia la meta de descarbonización local o global.
20
Elasticidad Energía/Producción
Por Planta / Lote
production_logs
Correlación estadística entre consumo y output para detectar ineficiencias de escala.
21
Optimización Tarifaria
Por Punto de Suministro
tariff_structure
Stress Test: Simular el historial de la sede con diferentes contratos del mercado.
22
Costo Energía No Aprovechada
Por Sede / Fuera de Horario
operational_params
Monetización del consumo en Standby durante horas no productivas del periodo.
23
Análisis Sensibilidad Climática
Por Región Geográfica
location_context
Normalización de gestión: kWh ajustados por Degree Days (HDD/CDD) locales.
24
Integridad Cadena Custodia
Por Auditoría / Archivo
audit_trail
Verificación de origen: % de datos respaldados por evidencia física (IoT o Foto).

Para responder a estas 24 preguntas de nivel Descriptivo utilizando tu arquitectura de Single Table Design en DynamoDB, la clave no está en calcular todo en el momento, sino en cómo aprovechas los Sort Keys (SK) y los Global Secondary Indexes (GSI).
Aquí tienes la explicación técnica de la estructura y el procedimiento para cada una:

I. Consumo, Gastos y Benchmarking (Finanzas y Eficiencia)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento Técnico
1
Consumo por Branch/Asset
GSI1_PK (BRANCH#ID), SK (METRIC#DATE)
Haces un Query al GSI1. Al estar ordenado por fecha en el SK, obtienes la serie temporal de consumo de esa rama específica sin leer toda la tabla.
2
Gasto monetario total
PK (ORG#ID), SK (INV#YEAR#MONTH)
Buscas por el prefijo INV#. Sumas el atributo financials_total_spend. Es una operación O(N) sobre el número de facturas.
3
Benchmarking sedes
Atributo analytics.energy_intensity
Consultas el ítem WEEKLY_METRICS de cada sede. Como ya tienes el campo calculado en el JSON de analytics, solo comparas los valores planos.
15
Costo por m2
financials_total_spend / physical_specs.m2
Cruzas el ítem de factura (INV#) con el ítem de información de edificio (BUILDING_INFO) para obtener el área y dividir.
21
Optimización Tarifaria
tariff_structure + METER_LOGS
Tomas el histórico de consumo de los METER_LOGS y aplicas la lógica matemática de los diferentes Maps en tariff_structure para ver cuál da el menor costo.

II. Operaciones e Ingeniería (Piso de Planta)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento Técnico
4
Desperdicio (Fugas)
topology (Parent/Child)
Sigues el árbol de la topology. Sumas el consumo de todos los hijos y lo restas del consumo del medidor padre. La diferencia es la fuga técnica o robo.
5
Energía Prod. vs Ociosa
operational_params.status
Cruzas el timestamp del log de energía con el log de estado. Si el status era IDLE pero el consumo era alto, esa energía se clasifica como ociosa.
7
Salud de Red
metrology.harmonics
Lees el Map de metrology del ítem más reciente. Si el valor de armónicos > umbral en tech_specs, disparas una alerta de calidad.
12
Eficiencia Distribución
topology + METER_LOGS
Comparas la energía que sale del Tablero Principal vs. la que llega a los Seccionales. La pérdida es la ineficiencia de tu cableado/transformadores.
13
Uso Carga Nominal
tech_specs.nominal_power
Divides el current_usage entre la potencia nominal del equipo. Cuentas cuántas horas el resultado fue > 0.70.
14
Consumos Fantasma
operational_params.hours
Filtras los METER_LOGS que ocurrieron fuera del rango de opening_hours definido en el perfil de la sucursal.

III. Sostenibilidad y Cumplimiento (ESG)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento Técnico
6
Trazabilidad ESG
carbon_data, GLOBAL#FACTORS
Multiplicas el consumo total del periodo por el co2e_value del ítem global de factores de emisión correspondiente a la región (ej. ISR).
11
Intensidad Carbono
ghg_total_co2e_kg / production_logs
Divides el total de CO2 del ítem WEEKLY_METRICS entre las unidades producidas reportadas en el log de producción de esa misma semana.
19
Brecha Net Zero
sustainability_standards
Comparas el ghg_total_co2e actual contra el ítem de TARGETS#YEAR, calculando el % de cumplimiento del presupuesto de carbono.
23
Sensibilidad Climática
location_context
Correlacionas el consumo diario con la temperatura exterior (HDD/CDD) guardada en el contexto de ubicación para ver cuánto afecta el clima al gasto.

IV. Auditoría y Calidad del Dato
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento Técnico
9
Calidad del dato
audit_trail.reliability_score
Calculas el ratio: (Mensajes recibidos / Mensajes esperados según frecuencia de muestreo). Se guarda en el ítem de métricas semanales.
18
Costo Procrastinación
ai_analysis.pending
Sumas el atributo potential_savings de todas las recomendaciones en el objeto ai_analysis que tienen status "PENDING" y cuya fecha de creación es antigua.
24
Integridad Custodia
audit_trail, validity
Verificas si el ítem tiene el flag is_verified: true y si tiene un link a un archivo adjunto (S3) que respalde el dato (como una foto del medidor).

Resumen para el Arquitecto
Para responder a este bloque descriptivo, tu backend de Svelte/Node.js debe seguir este patrón:
    1. Query Point: Siempre intenta leer ítems de tipo WEEKLY_METRICS o MONTHLY_METRICS. Ya tienen los atributos calculados (como energy_intensity o carbon_data) que ves en tu CSV.
    2. Relational Joins (In-Memory): Dado que DynamoDB no hace "Joins", traes el ítem de consumo y el ítem de contexto (como physical_specs para los m2) y haces la división en tu lógica de negocio.
    3. Visualization: Envías el JSON resultante al frontend, donde Svelte se encarga de renderizar los comparativos.



2. Capa Predictiva: "El Radar de Riesgos"
Objetivo: Anticipación financiera y resiliencia.
Procedimiento General: Extracción de series temporales (METER_LOGS) → Inferencia vía Lambda (o SageMaker) → Escritura en el objeto predictive_engine.


#
Pregunta de Negocio
Horizonte de Valor
Atributo / Lógica DynamoDB
Procedimiento de Inferencia y Estándar
1
Vida Útil Remanente (RUL)
Cuatrimestral / Anual
drift_score / lifecycle
Mantenimiento Predictivo: Algoritmos de degradación que estiman la fecha de fallo y optimizan el ciclo de reemplazo de activos (CAPEX).
2
Pronóstico de Cierre Financiero
Mensual / Cuatrimestral
predictive_engine
Deep Learning (LSTM/Prophet): Inferencia de consumo al cierre basada en estacionalidad, producción y variables externas (Días hábiles).
3
Simulación de Agotamiento Presupuestario
Mensual / Cuatrimestral
budget_config
Simulación Monte Carlo: 10,000 iteraciones para determinar la probabilidad (%) de "quemar" el presupuesto antes de tiempo bajo diversos escenarios.
4
Correlación Meteorológica Proyectada
Táctico (14 días)
location_context
Regresión Exógena: Ajuste de demanda proyectada según pronósticos de temperatura (HDD/CDD) para evitar sorpresas en facturación.
5
Planificación de Reservas (P90)
Anual (Presupuestación)
predictive_engine.p90
Estadística Bayesiana: Determinar el escenario de gasto "Casi Peor" para asegurar que la empresa tenga fondos suficientes en periodos de volatilidad.
6
Seguridad de Operación (Anomalías)
Táctico / Tiempo Real
analytics.is_anomaly
Unsupervised Learning: Identificación de patrones "fuera de huella" que predicen fugas o fallos inminentes antes de que se reflejen en el costo.
7
Valor en Riesgo de Carbono (VaR)
Estratégico (5+ años)
ghg_total_co2e
Shadow Pricing: Proyección del costo de emisiones basado en curvas de precios de bonos de carbono (ETS) para planeación Net-Zero.
8
Prevención de Multas por Demanda
Táctico (Minutos/Horas)
technical_constraints
Peak Load Forecasting: Predicción de la curva de carga en la próxima ventana de 15 min para gatillar acciones de Load Shedding.
9
ROI Proyectado de Mejoras
Anual / Plurianual
ai_analysis.savings
Inferencia de Medición y Verificación (M&V): Predicción del ahorro acumulado de una inversión (ej. paneles solares) vs. inflación energética.
10
Optimización de Turnos y Producción
Cuatrimestral
operational_context
Optimización Multiobjetivo: Recomendar horarios de mayor productividad con menor costo energético proyectado.



#
Pregunta de Negocio
Horizonte de Valor
Atributo / Lógica DynamoDB
Procedimiento de Inferencia (IA & Estándar)
11
Predicción de Riesgo de Auditoría Financiera
Anual / Cuatrimestral
audit_trail / validity
Anomalía en Integridad: IA que detecta discrepancias proyectadas entre facturas estimadas y consumos reales antes del cierre fiscal.
12
Optimización de Compra de Energía (VPP)
Mensual / Semanal
tariff_structure
Inferencia de Arbitraje: Predecir ventanas de tiempo donde el precio de la red será máximo para recomendar el uso de baterías o autogeneración.
13
Impacto Inflacionario en el OPEX Energético
Estratégico (1-3 años)
financials / historical_rates
Análisis de Series Temporales: Proyección del impacto del IPC y variaciones de mercado en el costo unitario del kWh futuro.
14
Probabilidad de Incumplimiento de Metas ESG
Anual
sustainability_standards
Backtesting Predictivo: Evaluar si el ritmo actual de descarbonización alcanzará el objetivo anual o si se requieren bonos de carbono adicionales.
15
Previsión de Flujo de Caja (Cash Flow)
Mensual (Táctico)
trazabilidad_total_invoices
Estimación de Pasivos: Calcular la fecha exacta y el monto probable de las próximas 3 facturas para optimización de tesorería.
16
Análisis de Sensibilidad de Producción
Cuatrimestral
production_logs
Inferencia de Elasticidad: Predecir cuánto aumentará el costo energético si se decide añadir un tercer turno de producción.
17
Detección de Degradación de Eficiencia (Drift)
Plurianual
energy_intensity
Modelado de Baselines: Predecir en qué punto un edificio perderá su certificación energética debido al envejecimiento de sistemas HVAC/Iluminación.
18
Predicción de Recargos por Factor de Potencia
Táctico (Mes)
metrology.reactive_energy
Inferencia de Energía Reactiva: Alerta temprana sobre la necesidad de compensación (bancos de capacitores) para evitar multas de la utilidad.
19
Valor de Reventa Proyectado de Activos
Estratégico
lifecycle / technical_specs
Inferencia de Valor Residual: Estimar la depreciación técnica basada en el estrés operativo real registrado por los sensores.
20
Simulación de Escenarios "What-If" de Expansión
Estratégico
topology / building_info
Gemelo Digital (Digital Twin): Predecir la huella energética y de carbono de una nueva sucursal antes de su construcción basándose en sedes similares.


Para la Capa Predictiva, el desafío arquitectónico en DynamoDB cambia: ya no solo consultamos lo que pasó, sino que almacenamos los resultados de modelos de Machine Learning (ML) e inferencias estadísticas.
En tu estructura de Single Table Design, esto se maneja mediante el atributo predictive_engine (un objeto Map dinámico) y el uso de Lambda Functions que actúan como "Inference Workers".
Aquí tienes la explicación técnica de la estructura y el procedimiento para tus 20 preguntas predictivas:

I. Mantenimiento y Activos (CAPEX Predictivo)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Inferencia (IA)
1
Vida Útil (RUL)
lifecycle + drift_score
Un modelo de Regresión analiza la tendencia del drift_score. Cuando la proyección cruza el umbral crítico definido en technical_specs, el sistema escribe la fecha estimada en predictive_engine.failure_date.
17
Degradación (Drift)
energy_intensity (Histórico)
Compara el energy_intensity actual contra la "Línea Base Maestra". Si la desviación proyectada supera el 15%, se predice la pérdida de certificación energética.
19
Valor de Reventa
lifecycle + usage_hours
Algoritmo de Depreciación Técnica: Cruza las horas de uso real con el estándar de la industria para predecir el valor residual en el ítem ASSET#FINANCIALS.

II. Finanzas, Presupuesto y Cash Flow (OPEX)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Inferencia (IA)
2
Cierre Financiero
predictive_engine.forecast
Modelo Prophet (Series Temporales): Toma el consumo acumulado de los METER_LOGS y proyecta los días restantes considerando si son laborables o feriados (operational_context).
3
Agotamiento Presupuestario
budget_config
Monte Carlo: Ejecuta 10k simulaciones variando el precio del kWh (tariff_structure) y la demanda. El resultado es un atributo predictive_engine.budget_burn_prob (%).
13
Impacto Inflacionario
financials.historical_rates
Aplica una proyección de IPC sobre los costos unitarios actuales para generar el escenario de gasto a 3 años en el ítem STRATEGIC_PLAN.
15
Previsión Cash Flow
trazabilidad_total_invoices
Identifica patrones de facturación (ej. la utility factura cada 45 días) para predecir la fecha del próximo INV# y su monto probable en predictive_engine.next_liability.

III. Operaciones y Riesgos Tácticos
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Inferencia (IA)
8
Prevención de Multas
technical_constraints (Max Demand)
Peak Load Forecasting: Analiza los últimos 15 min de metrology. Si la pendiente proyecta un cruce del límite en la siguiente ventana, dispara una alerta prescriptiva.
12
Compra Energía (VPP)
tariff_structure (Precios Horarios)
Inferencia de Arbitraje: Predice picos de precio en la red para recomendar el uso de baterías. El plan se guarda en predictive_engine.vpp_strategy.
18
Recargos por Reactiva
metrology.reactive_energy
Calcula el factor de potencia proyectado al cierre del mes. Si es < 0.90, predice el monto de la penalidad económica en la próxima factura.

IV. Estrategia ESG y Futuro (Net-Zero)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Inferencia (IA)
7
Riesgo Carbono (VaR)
ghg_total_co2e + External ETS Price
Multiplica tus toneladas proyectadas por el precio futuro de bonos de carbono. Permite al CFO ver el pasivo ambiental oculto en el balance.
14
Incumplimiento ESG
sustainability_standards
Backtesting: Compara la recta de reducción necesaria para llegar a la meta anual vs. la curva real proyectada. Identifica el "Gap" de toneladas no mitigadas.
20
Simulación Expansión
building_info (Twins)
K-Nearest Neighbors (KNN): Busca en la DB edificios con physical_specs similares y clona su huella energética para predecir el impacto de una nueva sede.

Arquitectura Técnica del "Motor Predictivo"
Para responder a estas preguntas en tu aplicación, el flujo de datos no es de lectura directa, sino un ciclo de inferencia:
    1. Trigger: DynamoDB Streams detecta nuevos METER_LOGS o cierres de semana.
    2. Compute: Una función Lambda (o SageMaker) extrae el histórico y corre el modelo (ej. LSTM para el Cierre Financiero #2).
    3. Write-Back: El resultado de la predicción se escribe de vuelta en el ítem correspondiente, dentro del objeto predictive_engine.
    4. Display: Tu frontend en Svelte simplemente consulta el atributo predictive_engine.



3. Capa Prescriptiva: "Estrategia de Optimización"
Objetivo: Generar acciones con ROI positivo.
Procedimiento General: Comparación de "Estado Actual" vs "Estado Ideal" (technical_specs) → Cálculo de brecha económica → Generación de recomendación en ai_analysis.


#
Pregunta de Negocio (Prescriptiva)
Horizonte
Lógica DynamoDB
Recomendación de Acción (Output del Sistema)
Impacto / ROI
1
Optimización de Producción
Semanal
energy_intensity
"Ajustar setpoints a [X] temperatura y [Y] velocidad, replicando el perfil de eficiencia del mejor día histórico."
↑ 15% Eficiencia
2
Prevención de Multas
Tiempo Real
tech_constraints
"Apagar activo [X] durante los próximos 20 min para mantener la demanda bajo el límite contratado."
Evita multa inmediata
3
Costo de Inacción
Mensual
baseline_adj
"La anomalía detectada en la línea 4 cuesta $[X]/hora. Reparar antes de terminar el turno para evitar pérdida acumulada."
Ahorro OPEX directo
4
Validación de Payback
Inversión
financials
"El reemplazo del motor por Clase IE4 tiene un payback de [X] años. Se recomienda incluir en presupuesto del próximo Q."
Optimización CAPEX
5
Acción de Oro (MACC)
Semanal
MACC_ranking
"Cambiar luminarias en bodega a LED es la acción de mayor ROI. Inversión: $[X] / Ahorro: $[Y] mes."
Rápida recuperación
6
Arbitraje de Tarifas
Compras
tariff_struct
"Migrar al Contrato [X] reduciría el gasto anual en un [X]% basándose en tu perfil de carga histórico."
Reducción costos fijos
7
Optimización de Turnos
Mensual
op_context
"Mover proceso de fundición a las 23:00hs. El diferencial tarifario ahorrará $[X] este mes."
Desplazamiento carga
8
Mantenimiento por ROI
Operativo
drift_score
"Intervenir bomba hidráulica B hoy; el costo de reparación es menor al desperdicio energético proyectado por fricción."
Extensión vida útil
9
Dimensionamiento Solar
Estratégico
loc_context
"Instalar [X] paneles adicionales para cubrir el aumento de carga previsto por la nueva línea de producción."
Resiliencia futura
10
Asignación de Capital
Anual
org_hierarchy
"Asignar el 60% del fondo de mejoras a Sucursal [X], donde el potencial de ahorro es 3x mayor que el resto."
Maximizacion de ROI
11
Reserva de Potencia
Trimestral
tech_constraints
"Reducir potencia contratada de 1.2MW a 1.0MW. Tu pico real nunca ha superado los 920kW en 24 meses."
Ahorro cargos fijos
12
Riesgo de Auditoría
Cuatrimestral
audit_trail
"Se detectó salto inusual en Building C. Adjuntar evidencia (foto/factura) para validar cierre mensual ante auditoría."
Compliance total
13
Estrategia Baterías
Táctico
pred_engine
"Cargar almacenamiento al 100% a las 02:00hs y descargar al 80% durante el pico de las 14:00hs."
Arbitraje de precio
14
Rebalanceo de Cargas
Operativo
metrology.harm
"Mover cargas de iluminación de Fase A a C. El desbalance actual causa pérdidas por calor de [X]%."
Protección activos
15
Compra Bonos Carbono
Anual
ghg_total_co2e
"Comprar [X] toneladas de créditos ahora; el precio proyectado para fin de año es 12% superior al actual."
Hedging financiero
16
Remplazo Tecnológico
Plurianual
lifecycle
"Retirar compresor #2. El costo de mantenimiento y energía excede el financiamiento de una unidad nueva."
Modernización rentable
17
Setpoints HVAC
Diario
loc_context
"Aumentar setpoint a 24°C entre 12:00 y 15:00. Confort térmico estable según humedad exterior proyectada."
Ahorro sin quejas
18
Validación de Factura
Mensual
trazabilidad
"La utility sobreestima consumo en [X]%. Generar reporte de reclamo adjuntando logs de telemetría."
Recuperación cobros
19
Resiliencia Infra
Estratégico
connectivity
"Instalar Gateway de respaldo en zona de calderas; se pierde el 10% de datos críticos para el reporte ESG."
Integridad de datos
20
Benchmarking Vendor
Compras
provider_info
"Para la expansión, comprar Marca X. Tienen un 12% mejor rendimiento real medido que Marca Y."
Compra basada en datos

#
Pregunta de Negocio (Prescriptiva)
Horizonte
Lógica DynamoDB
Recomendación de Acción (Output del Sistema)
Impacto / ROI
21
Conversión de OPEX a CAPEX (Solar)
Estratégico
financials.utility_bill
"Sustituir el 30% del gasto operativo en red por un sistema de autogeneración. Payback estimado: 3.2 años."
Reducción drástica de OPEX recurrente.
22
Alerta de Mantenimiento Reactivo (Fuga OPEX)
Semanal
drift_score / financials
"El costo de mantenimiento preventivo ($[X]) es 4x menor al costo de la energía desperdiciada por no intervenir. Reparar hoy."
Blindaje del flujo de caja mensual.
23
Optimización de Activos Bajo Arrendamiento
Anual
asset_lease_terms
"Basado en el uso real, el activo [X] está subutilizado. No renovar leasing o migrar a modelo 'Pay-per-use'."
Eficiencia en gastos fijos.
24
Presupuesto de Contingencia (OPEX)
Trimestral
predictive_engine.p90
"Proyectamos una subida de tarifas del 15% para el Q3. Reservar $[X] adicionales en el fondo operativo de energía."
Prevención de déficits presupuestarios.
25
Valor Residual de CAPEX (Depreciación)
Plurianual
lifecycle / energy_drift
"El activo [X] ha alcanzado su punto de inflexión. Vender como usado ahora recupera el 20% del CAPEX inicial antes de su obsolescencia."
Maximización de recuperación de capital.
26
Eficiencia de Implementación de Proyectos
Por Proyecto
ai_analysis.savings
"El Proyecto de Iluminación superó el ahorro proyectado en 12%. Replicar la misma configuración de CAPEX en la Sucursal [Y]."
Validación de tesis de inversión.
27
Análisis de Sensibilidad de Tasa de Interés
Estratégico
financials.interest_rates
"Con la tasa actual, financiar el nuevo Chiller vía crédito es más rentable que usar capital propio. Recomendación: Financiamiento."
Optimización de estructura de capital.
28
Reducción de Costo de Servicios (OPEX Cloud/SaaS)
Mensual
connectivity / data_usage
"Optimizar la frecuencia de envío de datos IoT en nodos no críticos. Reduce el costo de procesamiento AWS en un [X]%."
Eficiencia de costo tecnológico.
29
Evaluación de Proveedores (Total Cost of Ownership)
Compras
vendor_performance
"Elegir Proveedor B: Aunque su CAPEX es 10% mayor, su OPEX de mantenimiento es 30% menor a largo plazo."
Decisión basada en TCO (Costo Total).
30
Priorización de CAPEX por Riesgo Operativo
Anual
resilience_score
"Invertir en una segunda acometida eléctrica para Planta A. El costo del CAPEX es menor al riesgo de pérdida de producción por corte."
Resiliencia y mitigación de riesgo.


La Capa Prescriptiva es el cerebro de EkoLedger. Mientras que las capas anteriores informan y predicen, esta capa decide. En términos de ingeniería de datos, aquí es donde transformamos los objetos JSON de DynamoDB en órdenes de acción que generan ROI inmediato.
Para que tu arquitectura funcione, estas recomendaciones se almacenan principalmente en el atributo ai_analysis de tu esquema, actuando como un buzón de tareas pendientes para el usuario.

I. Optimización Táctica (Eficiencia de Piso y Operaciones)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Decisión (Algoritmo)
1
Optimización Best Run
energy_intensity + operational_params
Busca el registro histórico con menor energy_intensity para el mismo volumen de producción. Extrae sus setpoints y genera la recomendación de ajuste.
2
Prevención de Multas
technical_constraints + metrology
Si la predicción a 15 min supera el max_demand, el motor consulta el ranking de activos no críticos y emite la orden de apagado.
8
Mantenimiento por ROI
drift_score + financials
Compara el costo de reparación ($) vs. el costo de la energía desperdiciada por el "drift". Si el desperdicio > costo reparación, prescribe la intervención.
14
Rebalanceo de Cargas
metrology.harmonics
Analiza el desbalance entre fases. Si la diferencia es > 10%, recomienda mover activos específicos de la fase sobrecargada a la más ligera.

II. Ingeniería Financiera (CAPEX vs OPEX)
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Decisión (Algoritmo)
4
Validación de Payback
financials + tech_specs
Simula el consumo con las especificaciones del nuevo equipo vs. el actual. Calcula el ahorro mensual y lo divide por el CAPEX para dar el tiempo de retorno.
21
OPEX a CAPEX (Solar)
utility_bill + loc_context
Toma el gasto histórico en red y simula una planta solar basada en la irradiancia de la zona. Prescribe el tamaño del sistema para un payback < 4 años.
27
Sensibilidad de Tasa]
interest_rates + CAPEX_estimate
Compara el WACC (Costo de Capital) de la empresa vs. tasas de préstamos verdes. Si la tasa externa es menor, prescribe financiamiento en lugar de capital propio.
29
Evaluación TCO
vendor_performance
No elige el equipo más barato, sino el que tiene la suma de (Precio de compra + Energía proyectada a 10 años) más baja.

III. Auditoría, Cumplimiento y Riesgos
#
Pregunta
Estructura en DynamoDB (CSV)
Procedimiento de Decisión (Algoritmo)
12
Riesgo de Auditoría
audit_trail + is_anomaly
Si un dato es marcado como anomalía, el sistema bloquea el reporte ESG y prescribe: "Cargar evidencia fotográfica para validar integridad".
18
Validación de Factura
tariff_structure + metrology
Shadow Billing: El sistema recalcula la factura. Si la diferencia con la utility es > 2%, genera automáticamente el texto del reclamo administrativo.
15
Compra Bonos Carbono
ghg_total_co2e + market_prices
Si la proyección indica que no se llegará a la meta Net-Zero, prescribe la compra de bonos en el momento en que el precio de mercado es históricamente bajo.
30
Priorización de CAPEX
resilience_score
Evalúa qué sede tiene mayor probabilidad de corte eléctrico y costo de parada. Prescribe invertir en redundancia donde el riesgo financiero es mayor.
Pregunta 24: Integridad de Cadena de Custodia

Lógica: ¿Cómo sabemos que este dato es real?

Score por Origen:

Fiscal/API = 1.0 (Máxima confianza).

Email = 0.8 (Requiere validación de firma).

Mobile/Portal = 0.6 (Requiere revisión humana o IA avanzada).



Implementación del "Action Card" en Svelte
Para que el usuario ejecute estas recomendaciones, el objeto ai_analysis que recibes de DynamoDB debe transformarse en una interfaz de "Tarjetas de Acción":
    1. Status Check: El sistema solo muestra recomendaciones con status: "PENDING".
    2. Botón de Ejecución: Si el usuario pulsa "Aceptar", el sistema actualiza el registro a status: "EXECUTED" y guarda el timestamp.
    3. Medición de Impacto: 30 días después, el sistema compara el consumo real vs. la línea base previa para confirmar si el Impacto / ROI prometido se cumplió.


4. Alertas y Objetivos: "Acción Inmediata"
Objetivo: Mitigación de daños en tiempo real.
Procedimiento General: EventBridge (disparador) → Lambda (evaluador) → SNS/Push (notificador).
    • 32. Fuga Crítica:
        ◦ Procedimiento: Si en horario IDLE el consumo supera el umbral de seguridad, se asume equipo encendido o fuga.
    • 33. Penalidad Inminente (Power Factor):
        ◦ Procedimiento: Monitoreo del cos(phi) en metrology. Si baja de 0.92, se alerta por riesgo de multa inmediata.
    • 34. Seguimiento de Meta:
        ◦ Procedimiento: Comparación del acumulado de ghg_total_co2e contra el presupuesto de carbono (sustainability_standards).
    • 35. Anomalía de IA:
        ◦ Procedimiento: Un modelo de Unsupervised Learning detecta patrones de consumo fuera de la firma energética habitual del activo.

Conclusión de Arquitectura para Senior Architect
Para que este sistema escale:
    1. Capa Descriptiva: Los datos en STATS#MONTHLY deben ser tratados como una Vista Materializada. La Lambda de agregación debe dispararse en cada escritura de telemetría.
    2. Capa Predictiva: Utiliza AWS Step Functions para orquestar los modelos de predicción diarios, asegurando que el predictive_engine siempre esté fresco.
    3. Capa Prescriptiva: Las reglas de negocio deben vivir en un motor de reglas (o DynamoDB Config) para que los límites de "Acción de Oro" sean ajustables por el usuario sin tocar código.
