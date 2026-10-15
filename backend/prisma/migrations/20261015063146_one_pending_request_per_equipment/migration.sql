-- An employee may have at most one PENDING request per equipment item;
-- to ask for more they edit the existing request instead.
-- Prisma's schema language can't express a partial index, so it lives here.
-- The database enforces the rule even if two requests are submitted at once.
CREATE UNIQUE INDEX "requisitions_one_pending_per_user_equipment"
  ON "requisitions" ("user_id", "equipment_id")
  WHERE "status" = 'PENDING';
