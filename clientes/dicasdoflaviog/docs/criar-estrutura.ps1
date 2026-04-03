# ============================================================
# EUGENCIA DICASDOFLAVIOG — Criar estrutura de pastas
# Versão 2.0 - Com suporte a clientes
# Cole este script no terminal do VSCode (PowerShell - Windows)
# Para Mac: use o arquivo criar-estrutura.sh
# ============================================================

$base = "$HOME\dicasdoflaviog"

$pastas = @(
    "$base\_brand\clientes\dicasdoflaviog",
    "$base\_brand\clientes\qgdigital",
    "$base\_brand\design system",
    "$base\agentes\estrategista",
    "$base\agentes\copywriter",
    "$base\agentes\designer",
    "$base\agentes\publicador",
    "$base\agentes\engajador",
    "$base\scripts",
    "$base\briefs",
    "$base\outputs\copy",
    "$base\outputs\carrosseis",
    "$base\outputs\stories",
    "$base\outputs\alttext",
    "$base\arquivo"
)

foreach ($pasta in $pastas) {
    New-Item -ItemType Directory -Force -Path $pasta | Out-Null
    Write-Host "OK $pasta"
}

Write-Host ""
Write-Host "✅ Estrutura criada em: $base"
Write-Host "Próximo passo: cole os arquivos .txt dos agentes nas pastas certas."
