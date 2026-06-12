#!/bin/bash

# Script de ajuda para migração direta de dados entre dois bancos Supabase via psql/pg_dump
# Requisito: Você precisa ter o PostgreSQL instalado na máquina (pg_dump e psql)

# 1. Definir as URLs
# Onde encontrar a DB_URL do Supabase: Project Settings -> Database -> Connection string -> URI
SOURCE_DB_URL="coloque_a_url_do_banco_lovable_aqui"
DEST_DB_URL="coloque_a_url_do_novo_banco_aqui"

if [ "$SOURCE_DB_URL" == "coloque_a_url_do_banco_lovable_aqui" ]; then
  echo "ERRO: Você precisa editar o arquivo scripts/migrate-database.sh com as URLs corretas."
  exit 1
fi

echo "=> Iniciando exportação de dados da origem (apenas dados, sem recriar tabelas)..."
# Fazemos dump apenas dos DADOS (--data-only) do schema public
pg_dump --clean --if-exists --no-owner --no-privileges --data-only --schema=public --dbname="$SOURCE_DB_URL" -f backup_data.sql

if [ $? -ne 0 ]; then
  echo "Falha ao exportar os dados usando pg_dump."
  exit 1
fi

echo "=> Dados exportados para backup_data.sql. Iniciando importação no destino..."
# Desabilita triggers temporariamente (se possível) no restore, ou simplesmente insere
psql --dbname="$DEST_DB_URL" -f backup_data.sql

if [ $? -ne 0 ]; then
  echo "Alguns erros podem ter ocorrido durante o restore (comum com FKs e permissões). Verifique os logs acima."
else
  echo "=> Restauração concluída!"
fi

echo "\nNOTA: Lembre-se que as senhas e Auth ficam no schema 'auth'. Para transferi-los use o migrate-auth.mjs."
