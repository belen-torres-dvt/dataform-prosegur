/**
 * @file staging_helpers.js
 * @description Macros y utilidades para la capa de Staging (siglo_stg).
 * Sustituye scripts TPT y BTEQ de carga cruda desde ficheros planos / Oracle GL.
 */

/**
 * Limpia y normaliza un campo de tipo cadena (TRIM y NULL si está vacío).
 * @param {string} col - Nombre de la columna.
 * @returns {string} Expresión SQL BigQuery.
 */
function cleanString(col) {
  return `NULLIF(TRIM(${col}), '')`;
}

/**
 * Convierte de forma segura una cadena a NUMERIC con control de nulos.
 * @param {string} col - Nombre de la columna.
 * @param {number} [defaultVal=0] - Valor por defecto opcional si es nulo.
 * @returns {string} Expresión SQL BigQuery.
 */
function toNumeric(col, defaultVal = null) {
  const expr = `SAFE_CAST(NULLIF(TRIM(${col}), '') AS NUMERIC)`;
  return defaultVal !== null ? `COALESCE(${expr}, ${defaultVal})` : expr;
}

/**
 * Convierte de forma segura una cadena a INT64.
 * @param {string} col - Nombre de la columna.
 * @param {number} [defaultVal=-1] - Valor por defecto opcional.
 * @returns {string} Expresión SQL BigQuery.
 */
function toInt64(col, defaultVal = null) {
  const expr = `SAFE_CAST(NULLIF(TRIM(${col}), '') AS INT64)`;
  return defaultVal !== null ? `COALESCE(${expr}, ${defaultVal})` : expr;
}

/**
 * Convierte de forma segura cadenas con formato de fecha Teradata/Oracle a DATE.
 * Admite formatos como 'YYYYMMDD', 'YYYY-MM-DD', 'DD-MON-YY'.
 * @param {string} col - Nombre de la columna.
 * @param {string} [format='%Y%m%d'] - Formato esperado de la fecha.
 * @returns {string} Expresión SQL BigQuery.
 */
function toDate(col, format = "%Y%m%d") {
  return `SAFE.PARSE_DATE('${format}', NULLIF(TRIM(${col}), ''))`;
}

/**
 * Convierte una cadena de timestamp a TIMESTAMP.
 * @param {string} col - Nombre de la columna.
 * @param {string} [format='%Y-%m-%d %H:%M:%S'] - Formato del timestamp.
 * @returns {string} Expresión SQL BigQuery.
 */
function toTimestamp(col, format = "%Y-%m-%d %H:%M:%S") {
  return `SAFE.PARSE_TIMESTAMP('${format}', NULLIF(TRIM(${col}), ''))`;
}

/**
 * Genera las columnas de auditoría estándar de la capa Staging.
 * @returns {string} Fragmento SQL con columnas de auditoría.
 */
function stagingAuditColumns() {
  return `
    CURRENT_TIMESTAMP() AS tms_carga,
    CURRENT_DATE() AS fec_carga
  `;
}

module.exports = {
  cleanString,
  toNumeric,
  toInt64,
  toDate,
  toTimestamp,
  stagingAuditColumns
};
