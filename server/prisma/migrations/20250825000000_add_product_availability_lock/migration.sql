-- Marks products whose availability was chosen by a person, so the stock
-- automation leaves them alone instead of re-listing an item the bar pulled.
ALTER TABLE "products" ADD COLUMN "availabilityLocked" BOOLEAN NOT NULL DEFAULT false;
