/**
 * @file fact_helpers.js
 * @description Macros para las tablas de hechos financieras (FAC_BALANCE_REAL, FAC_AGR*, FAC_APUNTE).
 * Gestiona conversiones de divisa, cálculo de saldos neto, acumulación y particionamiento.
 */

/**
 * Convierte un importe a moneda corporativa (EUR) aplicando el tipo de cambio relacional.
 * @param {string} amountCol - Columna de importe origen.
 * @param {string} rateCol - Columna con el ratio de cambio (MSTR_CONV_MONEDA).
 * @param {string} [currencyCol='cod_moneda'] - Código de la moneda origen.
 * @returns {string} Expresión SQL calculada.
 */
function convertToEur(amountCol, rateCol, currencyCol = "cod_moneda") {
  return `
    CASE 
      WHEN ${currencyCol} = 'EUR' THEN ${amountCol}
      ELSE ROUND(SAFE_MULTIPLY(${amountCol}, COALESCE(${rateCol}, 1.0)), 2)
    END`.trim();
}

/**
 * Calcula el saldo contable neto (Debe - Haber) respetando signos financieros.
 * @param {string} debitCol - Columna de Debe.
 * @param {string} creditCol - Columna de Haber.
 * @returns {string} Expresión SQL.
 */
function netBalance(debitCol, creditCol) {
  return `ROUND(COALESCE(${debitCol}, 0) - COALESCE(${creditCol}, 0), 2)`;
}

/**
 * Devuelve la configuración de optimización en BigQuery para tablas de hechos masivas:
 * particionamiento por año/periodo y clustering dimensional.
 * @param {string} partitionField - Campo numérico o fecha para particionar.
 * @param {string[]} clusterFields - Campos de dimensiones clave para clustering.
 * @returns {Object} Configuración BigQuery para Dataform.
 */
function factBigQueryConfig(partitionField = "anio_periodo", clusterFields = ["ide_estructura_contable", "ide_libro_contable", "ide_moneda"]) {
  return {
    type: "incremental",
    schema: "siglo_dim_tot",
    bigquery: {
      partitionBy: `RANGE_BUCKET(${partitionField}, GENERATE_ARRAY(2000, 2035, 1))`,
      clusterBy: clusterFields
    }
  };
}

module.exports = {
  convertToEur,
  netBalance,
  factBigQueryConfig
};
