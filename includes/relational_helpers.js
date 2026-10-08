/**
 * @file relational_helpers.js
 * @description Macros para la capa Relacional/ODS (siglo_rel).
 * Reemplaza completamente el patrón legacy Teradata de tablas temporales
 * dif<TABLA> (altas 'A', cambios 'C', bajas 'B') y crg<TABLA> por MERGE atómico.
 */

/**
 * Genera la condición de comparación de columnas para detectar cambios ('C')
 * gestionando adecuadamente los valores NULL entre la tabla destino (T) y el origen (S).
 * @param {string[]} compareColumns - Lista de nombres de columnas a comparar.
 * @returns {string} Condición booleana SQL.
 */
function buildDiffCondition(compareColumns) {
  if (!compareColumns || compareColumns.length === 0) {
    return "FALSE";
  }
  return compareColumns
    .map(
      (col) =>
        `(T.${col} != S.${col} OR (T.${col} IS NULL AND S.${col} IS NOT NULL) OR (T.${col} IS NOT NULL AND S.${col} IS NULL))`
    )
    .join("\n    OR ");
}

/**
 * Genera la cláusula de asignación UPDATE para columnas de datos y auditoría en un MERGE.
 * @param {string[]} dataColumns - Columnas de negocio a actualizar.
 * @param {string} [batchIdParam='DATAFORM_JOB'] - Identificador del job ejecutor.
 * @returns {string} Asignaciones SQL.
 */
function buildUpdateAssignments(dataColumns, batchIdParam = "DATAFORM_JOB") {
  const dataUpdates = dataColumns
    .map((col) => `T.${col} = S.${col}`)
    .join(",\n    ");

  const auditUpdates = `
    T.fec_actualiz = CURRENT_TIMESTAMP(),
    T.ide_usuario_actualiz = COALESCE(S.ide_usuario_actualiz, -1),
    T.tms_modificacion = COALESCE(S.tms_modificacion, CURRENT_TIMESTAMP()),
    T.tms_carga_rel = CURRENT_TIMESTAMP(),
    T.ide_batch_txt_upd = '${batchIdParam}',
    T.flg_borrado_logico = 'N'`;

  return dataUpdates ? `${dataUpdates},\n${auditUpdates}` : auditUpdates;
}

/**
 * Construye una sentencia MERGE completa para modelos relacionales.
 * @param {Object} options
 * @param {string} options.targetTable - Nombre de la tabla destino con dataset (ej: `siglo_rel.mstr_empresa`).
 * @param {string} options.sourceCte - Nombre o subconsulta CTE del origen de datos ya tipado.
 * @param {string[]} options.keyColumns - Claves primarias o de negocio para el cruce ON.
 * @param {string[]} options.compareColumns - Columnas a auditar para detectar cambios.
 * @param {string[]} options.insertColumns - Columnas de negocio que se insertan en altas.
 * @param {string} [options.batchId='DATAFORM_JOB'] - Nombre del proceso batch.
 * @returns {string} Sentencia MERGE completa en BigQuery SQL.
 */
function buildMergeStatement({
  targetTable,
  sourceCte,
  keyColumns,
  compareColumns,
  insertColumns,
  batchId = "DATAFORM_JOB"
}) {
  const onCondition = keyColumns
    .map((k) => `T.${k} = S.${k}`)
    .join(" AND ");

  const diffCondition = buildDiffCondition(compareColumns);
  const updateAssignments = buildUpdateAssignments(compareColumns, batchId);

  const allInsertCols = [
    ...insertColumns,
    "fec_creacion",
    "ide_usuario_creacion",
    "fec_actualiz",
    "ide_usuario_actualiz",
    "tms_modificacion",
    "fec_inicio_negocio",
    "tms_carga_rel",
    "ide_proceso",
    "ide_batch_txt_ins",
    "ide_batch_txt_upd",
    "cod_origen_creacion",
    "flg_borrado_logico",
    "tms_carga"
  ];

  const allInsertValues = [
    ...insertColumns.map((c) => `S.${c}`),
    "COALESCE(S.fec_creacion, CURRENT_TIMESTAMP())",
    "COALESCE(S.ide_usuario_creacion, -1)",
    "COALESCE(S.fec_actualiz, CURRENT_TIMESTAMP())",
    "COALESCE(S.ide_usuario_actualiz, -1)",
    "COALESCE(S.tms_modificacion, CURRENT_TIMESTAMP())",
    "COALESCE(S.fec_inicio_negocio, CURRENT_DATE())",
    "CURRENT_TIMESTAMP()",
    "0",
    `'${batchId}'`,
    "CAST(NULL AS STRING)",
    "S.cod_origen_creacion",
    "'N'",
    "CURRENT_TIMESTAMP()"
  ];

  return `
MERGE ${targetTable} T
USING ${sourceCte} S
ON ${onCondition}
WHEN MATCHED AND (
    ${diffCondition}
) THEN
  UPDATE SET
    ${updateAssignments}
WHEN NOT MATCHED THEN
  INSERT (
    ${allInsertCols.join(",\n    ")}
  )
  VALUES (
    ${allInsertValues.join(",\n    ")}
  );
  `.trim();
}

/**
 * Genera la vista de deduplicación que toma el registro más reciente en caso de múltiples modificaciones.
 * Sustituye crg<TABLA>_V en Teradata.
 * @param {string} sourceTable - Tabla física.
 * @param {string[]} partitionKeys - Claves de partición para ROW_NUMBER.
 * @param {string} [orderKey='tms_modificacion'] - Clave de orden temporal.
 * @returns {string} Consulta SQL de deduplicación.
 */
function buildLatestView(sourceTable, partitionKeys, orderKey = "tms_modificacion") {
  const keysStr = partitionKeys.join(", ");
  return `
SELECT * EXCEPT (row_num)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${keysStr}
      ORDER BY ${orderKey} DESC, tms_carga_rel DESC
    ) AS row_num
  FROM ${sourceTable}
  WHERE flg_borrado_logico = 'N'
)
WHERE row_num = 1
  `.trim();
}

module.exports = {
  buildDiffCondition,
  buildUpdateAssignments,
  buildMergeStatement,
  buildLatestView
};
