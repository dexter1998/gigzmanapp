-- Starter chips on a new chat, curated 2026-10-31 from prod runs (14d, non-staff): kept to the
-- industries people actually search AND that fill (restaurant 68%, gym 72%, manufacturer 78%,
-- wholesaler 84%, school 77%, banquet/event 86–100%). Barber shops (20% fill, 4 of 5 runs empty) are
-- out; hotels are re-pointed at the signal that works for them (direct booking), not "online presence".
-- The page adds the user's city to each chip (lib/v2/suggest-city.ts), so none names a place here.
BEGIN;
DELETE FROM chat_suggestions;
INSERT INTO chat_suggestions (prompt_text, icp_category) VALUES
  ('Restaurants and cafes with no website', 'Food & Drink'),
  ('Gyms and fitness centres without a website', 'Sports & Fitness'),
  ('Manufacturers and wholesalers with no website', 'Business & B2B'),
  ('Real estate agents using only a Facebook or Instagram page', 'Professional Services'),
  ('Dental clinics with an old or broken website', 'Health & Wellness'),
  ('Schools and coaching institutes with no website', 'Education'),
  ('Banquet halls and event venues without a website', 'Events'),
  ('Chartered accountants who need a website', 'Professional Services'),
  ('Salons using Instagram as their website', 'Personal Care & Local Services'),
  ('Hotels with no direct booking on their website', 'Hotels & Accommodation'),
  ('Bakeries and sweet shops with no website', 'Food & Drink'),
  ('Startups that raised funding recently', 'Startups');
COMMIT;
