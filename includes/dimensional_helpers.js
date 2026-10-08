/**
 * @file dimensional_helpers.js
 * @description Macros para la capa Dimensional (siglo_dim / siglo_dim_tot).
 * Normaliza dimensiones, resuelve jerarquías, valores por defecto (-1),
 * traducciones multilingües y reglas de negocio corporativas (ej: flg_inditex).
 */

/**
 * Resuelve una clave foránea o dimensión asignando -1 si viene nula.
 * @param {string} col - Columna origen.
 * @param {number} [defaultVal=-1] - Valor numérico por defecto.
 * @returns {string} Expresión SQL.
 */
function defaultKey(col, defaultVal = -1) {
  return `COALESCE(${col}, ${defaultVal})`;
}

/**
 * Concatena código y descripción con separador limpio ' - '.
 * Sustituye expresiones Teradata: TRIM(cod) || ' - ' || TRIM(des)
 * @param {string} codeCol - Columna con el código.
 * @param {string} descCol - Columna con la descripción.
 * @returns {string} Expresión SQL.
 */
function concatCodeDesc(codeCol, descCol) {
  return `CONCAT(TRIM(COALESCE(${codeCol}, '')), ' - ', TRIM(COALESCE(${descCol}, '')))`;
}

/**
 * Aplica la regla de negocio corporativa para el flag Inditex.
 * Migrado desde DIM_CENTRO_COSTE.btq de Teradata.
 * @param {string} originCol - Columna de origen (cod_origen_creacion).
 * @param {string} costCenterCol - Columna de código de centro de coste.
 * @returns {string} Expresión CASE de BigQuery.
 */
function flagInditex(originCol = "cod_origen_creacion", costCenterCol = "cod_centro_coste") {
  return `
    CASE 
      WHEN ${originCol} = 1 AND ${costCenterCol} IN (
        'CS320', 'CS700', 'CS115', 'CS116', 'CS903', 
        'VS120', 'VS140', 'AS103', 'AS203', 'AS903', 'AS603'
      ) THEN 'Y'
      ELSE 'N'
    END`.trim();
}

/**
 * Genera la cláusula de selección con soporte multilingüe unificado.
 * Si el idioma no está disponible, hace fallback al idioma principal.
 * @param {string} baseTable - Alias de la tabla base.
 * @param {string} transTable - Alias de la tabla de traducción.
 * @param {string} [descCol='descripcion'] - Nombre de la columna de descripción.
 * @returns {string} Expresión SQL COALESCE con fallback.
 */
function multilingualFallback(baseTable, transTable, descCol = "descripcion") {
  return `COALESCE(${transTable}.${descCol}, ${baseTable}.${descCol}, 'NO INFORMADO')`;
}

/**
 * Configuración estándar de clustering para tablas de dimensiones en BigQuery.
 * @param {string[]} clusterCols - Columnas por las que clusterizar.
 * @returns {Object} Configuración para el bloque config de Dataform.
 */
function dimensionConfig(clusterCols = []) {
  return {
    type: "table",
    schema: "siglo_dim_tot",
    bigquery: {
      clusterBy: clusterCols.length > 0 ? clusterCols : ["cod_origen_creacion"]
    }
  };
}

module.exports = {
  defaultKey,
  concatCodeDesc,
  flagInditex,
  multilingualFallback,
  dimensionConfig
};
