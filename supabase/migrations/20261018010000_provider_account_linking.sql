DO $$
BEGIN
  IF EXISTS (
    SELECT user_id
    FROM public.providers
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Provider account linking requires one provider row per user. Resolve duplicate providers.user_id values before applying this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS providers_user_id_unique
  ON public.providers (user_id);
