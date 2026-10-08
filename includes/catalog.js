/**
 * @file catalog.js
 * @description Diccionario de metadatos del Data Warehouse SIGLO.
 * Contiene el registro de tablas por patrón para permitir generación dinámica
 * o parametrizada de modelos sin duplicar código ni archivos.
 */

const RELATIONAL_CATALOG = [
  {
    table_name: "mstr_empresa",
    description: "Maestro y jerarquía de empresas consolidadas",
    source_table: "stg_fnd_flev",
    key_columns: ["ide_empresa_orig", "cod_origen_creacion"],
    compare_columns: ["cod_empresa", "descripcion", "enabled_flag", "flg_resumen", "ide_tpo_empresa", "ide_territorio", "ide_idioma"],
    data_columns: ["ide_participante", "ide_empresa_orig", "cod_empresa", "descripcion", "enabled_flag", "flg_resumen", "ide_tpo_empresa", "ide_territorio", "ide_idioma"]
  },
  {
    table_name: "mstr_centro_coste",
    description: "Maestro de centros de coste operativos y corporativos",
    source_table: "stg_fnd_flev",
    key_columns: ["ide_centro_coste_orig", "cod_origen_creacion"],
    compare_columns: ["cod_centro_coste", "descripcion", "enabled_flag", "flg_resumen", "ide_idioma"],
    data_columns: ["ide_participante", "ide_centro_coste_orig", "cod_centro_coste", "descripcion", "enabled_flag", "flg_resumen", "ide_idioma"]
  },
  {
    table_name: "coer_agrupacion",
    description: "Estructura de agrupaciones de conceptos contables",
    source_table: "man_agrupacion",
    key_columns: ["ide_agrupacion", "cod_origen_creacion"],
    compare_columns: ["des_agrupacion", "fec_inicio", "fec_fin", "nom_usuario_creacion", "nom_informe_creacion_inicial"],
    data_columns: ["ide_agrupacion", "des_agrupacion", "fec_inicio", "fec_fin", "nom_usuario_creacion", "nom_informe_creacion_inicial"]
  },
  {
    table_name: "codi_categoria",
    description: "Codificación y mapeo de categorías de asientos contables",
    source_table: "stg_gl_jecateg",
    key_columns: ["cod_categoria", "cod_origen_creacion"],
    compare_columns: ["des_categoria"],
    data_columns: ["cod_categoria", "des_categoria"]
  },
  {
    table_name: "mstr_moneda",
    description: "Maestro de monedas internacionales y códigos ISO",
    source_table: "stg_fnd_curr",
    key_columns: ["cod_moneda", "cod_origen_creacion"],
    compare_columns: ["des_moneda", "enabled_flag"],
    data_columns: ["cod_moneda", "des_moneda", "enabled_flag"]
  }
];

const DIMENSIONAL_CATALOG = [
  {
    dimension_name: "dim_empresa",
    description: "Dimensión corporativa de empresas",
    relational_source: "mstr_empresa",
    surrogate_key: "ide_participante",
    business_keys: ["cod_empresa", "cod_origen_creacion"],
    cluster_by: ["ide_empresa_orig", "cod_empresa"]
  },
  {
    dimension_name: "dim_centro_coste",
    description: "Dimensión corporativa de centros de coste",
    relational_source: "mstr_centro_coste",
    surrogate_key: "ide_participante",
    business_keys: ["cod_centro_coste", "cod_origen_creacion"],
    cluster_by: ["cod_centro_coste"]
  },
  {
    dimension_name: "dim_libro_contable",
    description: "Dimensión de libros contables",
    relational_source: "colb_libro_contable",
    surrogate_key: "ide_libro_contable",
    business_keys: ["cod_libro_contable", "cod_origen_creacion"],
    cluster_by: ["cod_libro_contable"]
  }
];

module.exports = {
  RELATIONAL_CATALOG,
  DIMENSIONAL_CATALOG
};
