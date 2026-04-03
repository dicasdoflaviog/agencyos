#!/bin/bash
# ============================================================
# EUGENCIA DICASDOFLAVIOG — Criar estrutura de pastas
# Versão 2.0 - Com suporte a clientes
# Cole no terminal do Mac ou execute: bash criar-estrutura.sh
# ============================================================

BASE="$HOME/dicasdoflaviog"

PASTAS=(
  "$BASE/_brand/clientes/dicasdoflaviog"
  "$BASE/_brand/clientes/qgdigital"
  "$BASE/_brand/design system"
  "$BASE/agentes/estrategista"
  "$BASE/agentes/copywriter"
  "$BASE/agentes/designer"
  "$BASE/agentes/publicador"
  "$BASE/agentes/engajador"
  "$BASE/scripts"
  "$BASE/briefs"
  "$BASE/outputs/copy"
  "$BASE/outputs/carrosseis"
  "$BASE/outputs/stories"
  "$BASE/outputs/alttext"
  "$BASE/arquivo"
)

for pasta in "${PASTAS[@]}"; do
  mkdir -p "$pasta"
  echo "OK $pasta"
done

echo ""
echo "✅ Estrutura criada em: $BASE"
echo "Próximo passo: cole os arquivos .txt dos agentes nas pastas certas."
