-- Migration: 20260924000000_ranking_avatar_support.sql
-- Description: Suporte a avatar no perfil e ranking global com isolamento de privacidade

-- 1. Garantir que a coluna avatar_url existe na tabela players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Conceder permissões de escrita para colunas de perfil incluindo avatar_url
GRANT INSERT (id, username, avatar_emoji, avatar_url, last_active_at), 
      UPDATE (id, username, avatar_emoji, avatar_url, last_active_at) 
ON public.players TO authenticated;

-- 3. Manter a tabela players privada para o próprio usuário/admin (protegendo e-mails)
DROP POLICY IF EXISTS players_read ON public.players;
CREATE POLICY players_read ON public.players FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.players TO authenticated;

-- 4. Recriar a view global_leaderboard com a coluna avatar_url
DROP VIEW IF EXISTS public.global_leaderboard CASCADE;

CREATE VIEW public.global_leaderboard AS
SELECT 
    gs.id,
    gs.player_id,
    gs.player_name,
    gs.score,
    gs.time_seconds,
    gs.clears,
    gs.combo,
    gs.created_at,
    p.avatar_url,
    RANK() OVER (ORDER BY gs.score DESC, gs.time_seconds ASC) AS rank
FROM public.game_sessions gs
LEFT JOIN public.players p ON p.id = gs.player_id
ORDER BY gs.score DESC, gs.time_seconds ASC;

GRANT SELECT ON public.global_leaderboard TO anon, authenticated;

