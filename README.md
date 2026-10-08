# Dataform SIGLO - Arquitectura y Patrones de Conversión a BigQuery

Este proyecto implementa la migración y modernización del Data Warehouse financiero (**SIGLO**) de Prosegur, transformando los procesos batch legacy de **Teradata BTEQ / TPT y Korn Shell** en pipelines declarativos y optimizados de **Google Cloud Dataform y BigQuery Standard SQL**.

---

## 🎯 Principio de Diseño: 1 Fichero por Patrón y Cero Duplicidad de Código

En lugar de crear cientos de archivos `.sqlx` casi idénticos para los 329 componentes legacy, la arquitectura se estructura en torno a **5 Patrones Maestros** soportados por **librerías de macros en JavaScript (`includes/`)**:

```
dataform_siglo/
├── workflow_settings.yaml         # Configuración del entorno BigQuery / Dataform
├── package.json                   # Dependencias de Dataform Core
├── includes/                      # LIBRERÍA DE MACROS Y HELPERS
│   ├── staging_helpers.js         # Macros para tipado seguro, saneamiento y carga de Staging
│   ├── relational_helpers.js      # Macros para detección delta y MERGE atómico
│   ├── dimensional_helpers.js     # Macros para dimensiones, jerarquías y reglas de negocio
│   ├── fact_helpers.js            # Macros para hechos contables, divisas y agregaciones
│   └── catalog.js                 # Diccionario de metadatos de entidades
└── definitions/                   # DEFINICIÓN DE MODELOS (1 POR PATRÓN)
    ├── stg/
    │   └── pattern_stg_clean.sqlx               # PATRÓN 1: Ingesta y Limpieza Tipada Staging
    ├── rel/
    │   ├── pattern_rel_merge.sqlx               # PATRÓN 2: Fusión Delta Relacional (MERGE ODS)
    │   └── pattern_rel_balance_incremental.sqlx # PATRÓN 3: Transaccional Incremental de Balances
    ├── dim/
    │   ├── pattern_dim_dimension.sqlx           # PATRÓN 4: Dimensión Consolidada y Multilingüe
    │   └── pattern_dim_fact.sqlx                # PATRÓN 5: Hechos Financieros Masivos (P&L)
    └── dynamic_models.js                        # GENERADOR DINÁMICO: Compila N tablas desde catálogo
```

---

## 📊 Mapeo de Patrones: Teradata vs. BigQuery Dataform

| # | Capa | Patrón Arquitectónico | Fichero Template `.sqlx` | Macros Utilizadas | Reemplazo Tecnológico Legacy |
|---|---|---|---|---|---|
| **1** | **Staging (`siglo_stg`)** | Ingesta, saneamiento y tipado | `definitions/stg/pattern_stg_clean.sqlx` | `staging_helpers.js` | Reemplaza esquemas `.tpt` (FastLoad) y scripts `.btq` de índices/estadísticas. Aplica `SAFE_CAST`, `TRIM` y parseo de fechas. |
| **2** | **Relacional (`siglo_rel`)** | Fusión Delta ODS con `MERGE` | `definitions/rel/pattern_rel_merge.sqlx` | `relational_helpers.js` | Reemplaza tablas intermedias `dif<TABLA>` (altas 'A', cambios 'C'), tablas `crg<TABLA>` y scripts de cierre `FIN_REL_*.btq`. |
| **3** | **Relacional (`siglo_rel`)** | Balances e históricos incrementales | `definitions/rel/pattern_rel_balance_incremental.sqlx` | `staging_helpers.js` | Sustituye cargas masivas de `COLB_BALANCE.btq`. Implementa `type: "incremental"` particionado por rango anual y clusterizado. |
| **4** | **Dimensional (`siglo_dim_tot`)**| Dimensiones y jerarquías multilingües | `definitions/dim/pattern_dim_dimension.sqlx` | `dimensional_helpers.js` | Sustituye `DIM_*.btq`. Resuelve claves foráneas no informadas (`-1`), traducciones (`aux*IDIOMA`), y flags (`flg_inditex`). |
| **5** | **Dimensional (`siglo_dim_tot`)**| Tablas de Hechos financieras y P&L | `definitions/dim/pattern_dim_fact.sqlx` | `fact_helpers.js` | Sustituye `FAC_BALANCE_REAL.btq`. Contravaloración a EUR (`MSTR_CONV_MONEDA`), saldos Debe/Haber y particionamiento. |
| **+** | **Todas las capas** | Generación Dinámica Programática | `definitions/dynamic_models.js` | `catalog.js` | Permite compilar y publicar en BigQuery cualquier tabla registrada en el catálogo sin crear archivos `.sqlx` adicionales. |

---

## 🛠️ Guía Rápida de las Macros Disponibles (`includes/`)

### 1. `staging_helpers.js`
* `cleanString(col)`: Sanea strings con `NULLIF(TRIM(col), '')`.
* `toInt64(col, defaultVal)`: Convierte a entero `INT64` con control de nulos.
* `toNumeric(col, defaultVal)`: Convierte a decimal financiero `NUMERIC`.
* `toDate(col, format)`: Parsea fechas con formato configurable (ej: `%Y%m%d`).
* `stagingAuditColumns()`: Inserta marcas temporales estándar `tms_carga` y `fec_carga`.

### 2. `relational_helpers.js`
* `buildMergeStatement({ targetTable, sourceCte, keyColumns, compareColumns, insertColumns, batchId })`:
  Genera la sentencia `MERGE` atómica de BigQuery, evaluando diferencias campo a campo y manteniendo la trazabilidad histórica (`fec_creacion`, `fec_actualiz`, `tms_modificacion`, `flg_borrado_logico`).
* `buildLatestView(sourceTable, partitionKeys)`:
  Genera la vista de deduplicación de última foto válida (`ROW_NUMBER() OVER (...)`).

### 3. `dimensional_helpers.js`
* `defaultKey(col, defaultVal)`: Asigna `-1` a claves huérfanas o no informadas.
* `concatCodeDesc(codeCol, descCol)`: Formatea descripciones analíticas (`COD - DESCRIPCION`).
* `flagInditex(originCol, costCenterCol)`: Traduce la regla corporativa de centros de coste Inditex.
* `multilingualFallback(base, trans, col)`: Resolución de descripciones multilingües con fallback.

### 4. `fact_helpers.js`
* `convertToEur(amountCol, rateCol, currencyCol)`: Convierte moneda local a EUR con redondeo a 2 decimales.
* `netBalance(debitCol, creditCol)`: Calcula el saldo neto contable (Debe - Haber).
* `factBigQueryConfig(partitionField, clusterFields)`: Devuelve la configuración de particionamiento y clustering.
