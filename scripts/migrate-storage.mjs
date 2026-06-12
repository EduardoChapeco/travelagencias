import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Credenciais de ORIGEM (Lovable)
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;

// Credenciais de DESTINO (Novo Supabase)
const DEST_URL = process.env.DEST_SUPABASE_URL;
const DEST_KEY = process.env.DEST_SERVICE_ROLE_KEY;

if (!SOURCE_URL || !SOURCE_KEY || !DEST_URL || !DEST_KEY) {
  console.error("ERRO: Faltam variáveis de ambiente!");
  console.error("Execute com: SOURCE_SUPABASE_URL=... SOURCE_SERVICE_ROLE_KEY=... DEST_SUPABASE_URL=... DEST_SERVICE_ROLE_KEY=... node scripts/migrate-storage.mjs");
  process.exit(1);
}

const sourceSb = createClient(SOURCE_URL, SOURCE_KEY);
const destSb = createClient(DEST_URL, DEST_KEY);

const buckets = [
  'proposal-attachments','contract-pdfs','voucher-sources','voucher-pdfs',
  'financial-receipts','passenger-documents','support-attachments',
  'agency-logos','agency-covers','proposal-covers','group-tour-gallery',
  'blog-covers','client-avatars'
];

async function createDestBuckets() {
  console.log("=> Garantindo que os buckets existem no destino...");
  for (const bucket of buckets) {
    const { data, error } = await destSb.storage.createBucket(bucket, { public: false });
    if (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log(`Bucket ${bucket} já existe.`);
      } else {
        console.error(`Erro ao criar bucket ${bucket}:`, error.message);
      }
    } else {
      console.log(`Bucket ${bucket} criado no destino.`);
    }
  }
}

async function migrateBucket(bucket, prefix = '') {
  const { data, error } = await sourceSb.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    console.error(`Erro ao listar ${bucket}/${prefix}:`, error.message);
    return;
  }
  
  if (!data || data.length === 0) return;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    
    // É um diretório (folder) se id === null
    if (item.id === null) {
      // Ignorar o folder fantasma ".emptyFolderPlaceholder" que o supabase às vezes cria
      if (item.name === '.emptyFolderPlaceholder') continue;
      await migrateBucket(bucket, fullPath);
      continue;
    }

    console.log(`=> Copiando [${bucket}] ${fullPath}...`);
    
    // Download da Origem
    const { data: fileBlob, error: downloadError } = await sourceSb.storage.from(bucket).download(fullPath);
    if (downloadError) {
      console.error(`   Erro no download de ${fullPath}:`, downloadError.message);
      continue;
    }

    const fileBuf = Buffer.from(await fileBlob.arrayBuffer());

    // Upload pro Destino
    const { data: uploadData, error: uploadError } = await destSb.storage.from(bucket).upload(fullPath, fileBuf, {
      upsert: true, // Garante que se rodar de novo não dá erro
      contentType: item.metadata?.mimetype || 'application/octet-stream'
    });

    if (uploadError) {
      console.error(`   Erro no upload de ${fullPath}:`, uploadError.message);
    } else {
      console.log(`   OK! -> [${bucket}] ${fullPath}`);
    }
  }
}

async function run() {
  console.log("Iniciando migração de Storage...");
  await createDestBuckets();
  
  for (const b of buckets) {
    console.log(`\n--- Migrando bucket: ${b} ---`);
    await migrateBucket(b);
  }
  console.log("\nMigração de Storage concluída!");
}

run();
