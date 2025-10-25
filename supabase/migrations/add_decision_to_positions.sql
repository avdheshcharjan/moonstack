-- Add decision column to user_positions table to track YES/NO bets
-- Also add question field to store the bet question

ALTER TABLE public.user_positions
ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('YES', 'NO')),
ADD COLUMN IF NOT EXISTS question TEXT,
ADD COLUMN IF NOT EXISTS threshold NUMERIC,
ADD COLUMN IF NOT EXISTS bet_size NUMERIC;

-- Create index for filtering by decision
CREATE INDEX IF NOT EXISTS idx_user_positions_decision ON public.user_positions(decision);

-- Update existing records to have decision based on is_call
-- YES = call option, NO = put option (for binary options)
UPDATE public.user_positions
SET decision = CASE
  WHEN is_call = true THEN 'YES'
  ELSE 'NO'
END
WHERE decision IS NULL;
