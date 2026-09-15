-- Migration: 20260915184500_create_leaderboard_schema.sql
-- Description: Schema para placar online e dados de jogadores do Hexa Sort 3D

-- 1. Tabela de Jogadores (Identidade / Perfil)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🎮',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Tabela de Partidas / Pontuações
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    player_name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
    clears INTEGER NOT NULL DEFAULT 0 CHECK (clears >= 0),
    combo INTEGER NOT NULL DEFAULT 1 CHECK (combo >= 1),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Índices de Alta Performance para o Ranking
CREATE INDEX IF NOT EXISTS idx_game_sessions_score_desc 
ON public.game_sessions (score DESC, time_seconds ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id 
ON public.game_sessions (player_id);

-- 4. View de Ranking Global (Top Scores únicos por jogador ou melhor partida)
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
    gs.id,
    gs.player_id,
    gs.player_name,
    gs.score,
    gs.time_seconds,
    gs.clears,
    gs.combo,
    gs.created_at,
    RANK() OVER (ORDER BY gs.score DESC, gs.time_seconds ASC) AS rank
FROM public.game_sessions gs
ORDER BY gs.score DESC, gs.time_seconds ASC;

-- 5. Configuração de Row Level Security (RLS)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela de jogadores (leitura e cadastro anônimo pelo jogo)
CREATE POLICY "Permitir leitura pública de jogadores"
ON public.players
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir inserção de jogadores pelo cliente"
ON public.players
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de jogadores"
ON public.players
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Políticas para sessões de jogo (leitura pública e envio de pontuação)
CREATE POLICY "Permitir leitura pública das pontuações"
ON public.game_sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir inserção de novas pontuações"
ON public.game_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
