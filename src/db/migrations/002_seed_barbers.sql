-- Demo juuksurid (nõutav avaliku vaate jaoks)
INSERT INTO barbers (name) VALUES ('Mari Tamm')       ON CONFLICT DO NOTHING;
INSERT INTO barbers (name) VALUES ('Jaan Kask')       ON CONFLICT DO NOTHING;
INSERT INTO barbers (name) VALUES ('Liisa Saar')      ON CONFLICT DO NOTHING;
