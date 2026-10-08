/**
 * @file dynamic_models.js
 * @description Generador dinámico de modelos Dataform para el Data Warehouse SIGLO.
 * Demuestra la capacidad de Dataform de compilar múltiples modelos a partir de un único
 * fichero de definición y el catálogo de metadatos, evitando duplicar ficheros .sqlx.
 */

const { RELATIONAL_CATALOG, DIMENSIONAL_CATALOG } = require("includes/catalog");
const rel = require("includes/relational_helpers");
const dim = require("includes/dimensional_helpers");

// 1. Generación dinámica de tablas Relacionales con patrón MERGE
RELATIONAL_CATALOG.forEach((item) => {
  publish(item.table_name, {
    type: "operations",
    schema: "siglo_rel",
    tags: ["siglo_rel", "catalogo_dinamico", "poc_pl"],
    description: item.description
  }).query((ctx) => {
    const db = ctx.database || "prosegur-siglo-poc";
    const target = `\`${db}.siglo_rel.${item.table_name}\``;
    const source = `\`${db}.siglo_stg.${item.source_table}\``;

    return rel.buildMergeStatement({
      targetTable: target,
      sourceCte: `(SELECT ${item.data_columns.join(", ")} FROM ${source})`,
      keyColumns: item.key_columns,
      compareColumns: item.compare_columns,
      insertColumns: item.data_columns,
      batchId: item.table_name.toUpperCase()
    });
  });

  // Genera automáticamente la vista de deduplicación correspondiente
  publish(`${item.table_name}_v`, {
    type: "view",
    schema: "siglo_rel",
    tags: ["siglo_rel", "vistas", "poc_pl"],
    description: `Vista de última foto activa para ${item.table_name}`
  }).query((ctx) => {
    const db = ctx.database || "prosegur-siglo-poc";
    const target = `\`${db}.siglo_rel.${item.table_name}\``;
    return rel.buildLatestView(target, item.key_columns);
  });
});

// 2. Generación dinámica de Dimensiones con patrón dimensional
DIMENSIONAL_CATALOG.forEach((item) => {
  publish(item.dimension_name, {
    type: "table",
    schema: "siglo_dim_tot",
    tags: ["siglo_dim_tot", "catalogo_dinamico", "poc_pl"],
    description: item.description,
    bigquery: {
      clusterBy: item.cluster_by
    }
  }).query((ctx) => {
    const db = ctx.database || "prosegur-siglo-poc";
    const relSource = `\`${db}.siglo_rel.${item.relational_source}\``;

    return `
      SELECT
        ${item.surrogate_key},
        ${item.business_keys.join(", ")},
        tms_modificacion,
        cod_origen_creacion,
        CURRENT_TIMESTAMP() AS tms_carga_dim
      FROM ${relSource}
      WHERE flg_borrado_logico = 'N'
    `.trim();
  });
});
