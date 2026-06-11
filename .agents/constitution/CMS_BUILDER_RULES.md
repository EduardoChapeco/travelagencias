# Regras de CMS e Builder — TravelOS

---

## Um CMS Só É Real Se Tiver

| Componente | Obrigatório | Status Mínimo |
|------------|-------------|---------------|
| Página/Post entity | ✅ | Tabela + CRUD |
| Blocos/Sections | ✅ | Schema por tipo de bloco |
| Editor por bloco | ✅ | UI para editar cada tipo |
| Renderer por bloco | ✅ | Renderização pública |
| Persistência | ✅ | Salvar no banco |
| Draft/Published | ✅ | Campo `status` com lógica |
| Preview | ✅ | Ver antes de publicar |
| Slug | ✅ | URL amigável única |
| SEO | ✅ | title, description, og:image |
| Storage/Media | ✅ | Upload de imagens integrado |
| RLS | ✅ | Segurança multi-tenant |
| Logs | ✅ | Quem editou, quando |
| Permissões | ✅ | Quem pode publicar |
| Página pública | ✅ | URL acessível externamente |
| Erro tratado | ✅ | Falhas visíveis ao editor |

**Se faltar qualquer item acima, chamar de "CRUD de páginas", não "CMS avançado".**

---

## Um Builder Só É Real Se

- [ ] Não for apenas JSON manual (tem UI visual para editar)
- [ ] Permitir adicionar blocos
- [ ] Permitir remover blocos
- [ ] Permitir reordenar blocos (drag and drop ou controles)
- [ ] Salvar no banco
- [ ] Publicar (mudar status de draft para published)
- [ ] Renderizar na página pública
- [ ] Reabrir para editar (carregar estado salvo)
- [ ] Persistir após refresh
- [ ] Ter preview real (não apenas "ver JSON")
- [ ] Ter validação (bloco sem título = erro)
- [ ] Usar dados reais (não placeholder)

**Se não tiver tudo acima, chamar de "editor de JSON" ou "formulário de blocos", não "Builder avançado".**

---

## Regras de Interface para CMS/Builder

1. **Builder NUNCA em popup/modal central.** Sempre em página dedicada ou Sheet amplo.
2. **Editor de bloco deve ter preview inline** (ver resultado enquanto edita).
3. **Media Library deve ser Sheet lateral**, não modal central.
4. **Blog/Post list deve ter filtros, busca e status visível.**
5. **Publicação deve ter confirmação** (não publicar com um clique acidental).

---

## Tipos de Bloco Mínimos para CMS de Turismo

| Bloco | Campos |
|-------|--------|
| Hero | title, subtitle, bg_image_url, cta_label, cta_link |
| Text | content (rich text), align, image_url |
| Features | title, items[{icon, title, description}] |
| Gallery | title, images[{url, caption}] |
| FAQ | title, items[{question, answer}] |
| CTA | title, subtitle, button_label, button_link |
| Testimonials | title, items[{name, text, avatar, rating}] |
| Pricing | title, plans[{name, price, features, cta}] |
| Contact Form | title, fields config |
| Map | title, address, coordinates |
