import { createClient } from '@supabase/supabase-js';

// Credenciais de ORIGEM (Lovable)
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;

// Credenciais de DESTINO (Novo Supabase)
const DEST_URL = process.env.DEST_SUPABASE_URL;
const DEST_KEY = process.env.DEST_SERVICE_ROLE_KEY;

if (!SOURCE_URL || !SOURCE_KEY || !DEST_URL || !DEST_KEY) {
  console.error("ERRO: Faltam variáveis de ambiente!");
  console.error("Execute com: SOURCE_SUPABASE_URL=... SOURCE_SERVICE_ROLE_KEY=... DEST_SUPABASE_URL=... DEST_SERVICE_ROLE_KEY=... node scripts/migrate-auth.mjs");
  process.exit(1);
}

const sourceSb = createClient(SOURCE_URL, SOURCE_KEY);
const destSb = createClient(DEST_URL, DEST_KEY);

async function run() {
  console.log("=> Buscando usuários na Origem...");
  
  // Lista até 1000 usuários (ajuste a paginação se o projeto for enorme)
  const { data: usersData, error: listError } = await sourceSb.auth.admin.listUsers({ perPage: 1000 });
  
  if (listError) {
    console.error("Erro ao listar usuários na Origem:", listError.message);
    process.exit(1);
  }

  const users = usersData?.users || [];
  console.log(`Encontrados ${users.length} usuários.`);

  for (const user of users) {
    console.log(`=> Migrando usuário: ${user.email} (ID: ${user.id})`);
    
    // Como a hash da senha não é exportável via client API (mesmo Service Role),
    // nós recriamos o usuário com o mesmo ID (importante para manter as FKs) e
    // uma senha aleatória que ele terá que resetar via 'Esqueci a Senha'.
    const { data: createdUser, error: createError } = await destSb.auth.admin.createUser({
      id: user.id, // Preservar UUID exato
      email: user.email,
      phone: user.phone || undefined,
      email_confirm: true, // Ignora envio de email de confirmação inicial
      phone_confirm: true,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      // Uma senha aleatória impossível, ele DEVE fazer reset
      password: 'ResetMe' + Math.random().toString(36).substring(2, 15) + 'A1!'
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
         console.log(`   [SKIP] Usuário ${user.email} já existe no destino.`);
      } else {
         console.error(`   [ERRO] Falha ao migrar ${user.email}:`, createError.message);
      }
    } else {
      console.log(`   [OK] Migrado com sucesso.`);
    }
  }

  console.log("\nMigração de Auth finalizada!");
  console.log("ATENÇÃO: Instrua seus usuários a utilizar a opção 'Esqueci minha senha' no primeiro acesso, pois as senhas antigas não puderam ser copiadas.");
}

run();
