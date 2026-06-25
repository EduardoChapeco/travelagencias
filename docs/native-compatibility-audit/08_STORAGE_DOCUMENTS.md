# Auditoria de Storage e Documentação de Mídia

Este documento avalia se o Motor de Cotações Inteligentes VibeTour faz uso de armazenamento de arquivos (Buckets) no Supabase Storage e se as regras de segurança aplicáveis estão alinhadas com as diretrizes do sistema.

---

## 1. Inventário de Uploads e Buckets Utilizados

O Motor VibeTour na fase atual **não realiza uploads de arquivos físicos** (como arquivos PDF de roteiros, imagens de vouchers ou comprovantes) para o Supabase Storage.

- **Tabelas Relacionadas**: Nenhuma tabela do módulo possui colunas apontando para chaves de objetos de storage (como `storage_path` ou `bucket_id`).
- **UI**: As imagens mostradas nas propostas ou alternativas de hotéis são geradas e consumidas como URLs estáticas de terceiros (retornadas no JSON de busca do Infotravel ou geradas dinamicamente).

---

## 2. Padrão Recomendado para Futuros Uploads

Se houver necessidade de salvar propostas PDF geradas localmente ou fotos personalizadas enviadas por agentes para o cérebro semântico:

1. **Escopo de Tenant**: Os arquivos devem ser gravados em caminhos privados contendo o ID da agência:
   - Caminho: `/vibetour/agencies/{agency_id}/documents/{document_id}/{filename}`
2. **Validação de Tipo (MIME Type)**: Restringir uploads a `application/pdf` e imagens `image/jpeg`, `image/png`, `image/webp`.
3. **Limitação de Tamanho**: Bloquear arquivos maiores que 5MB no cliente e via RLS policy do storage bucket.
4. **Assinatura Temporária (Signed URLs)**: Links de acesso a roteiros devem expirar em no máximo 24 horas para evitar vazamento de dados via URLs persistentes em indexadores públicos.
5. **Políticas de RLS no Storage**:
   - `SELECT`: Restringir leitura a membros da agência ou via Signed URLs expiráveis.
   - `INSERT / UPDATE`: Permitir apenas para agentes autenticados que pertençam à agência mapeada no path.
