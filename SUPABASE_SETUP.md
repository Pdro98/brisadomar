# Configurar sincronização com Supabase

O armazenamento anterior era `localStorage`, que é separado em cada navegador e aparelho. O Supabase passa a guardar viagens, imagens e contato em um banco compartilhado.

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No painel do projeto, abra **SQL Editor**, cole o conteúdo de `supabase-setup.sql` e execute.
3. Em **Authentication**, crie a conta do administrador. Desative o cadastro público de usuários para que visitantes não possam criar contas.
4. Autorize a conta criada, substituindo o e-mail no comando abaixo pelo e-mail do administrador:

   ```sql
   insert into public.site_admins (user_id)
   select id from auth.users where email = 'admin@exemplo.com'
   on conflict (user_id) do nothing;
   ```

5. Em **Project Settings > API**, copie a **Project URL** e a chave pública (**anon** ou **publishable**) para `supabase-config.js`. Não use nem publique a chave `service_role`.
6. Faça o deploy novamente no Vercel. As viagens agora serão carregadas do banco e alterações feitas por uma conta autorizada serão compartilhadas entre aparelhos.

Na primeira entrada do administrador em cada aparelho, o site oferece importar viagens antigas personalizadas que ainda estejam no armazenamento local daquele aparelho. Isso pode recuperar a viagem cadastrada anteriormente no celular; os arquivos nunca foram enviados ao Vercel e só podem ser importados enquanto ainda estiverem disponíveis no navegador original.
