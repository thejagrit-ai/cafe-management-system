-- The `inventory` table was an early attempt at per-product stock that was
-- never wired up: no code has ever read from or written to it. Stock is held
-- on `ingredients` and drawn down through recipes, so the table only misled
-- anyone reading the schema.
DROP TABLE IF EXISTS "inventory";
