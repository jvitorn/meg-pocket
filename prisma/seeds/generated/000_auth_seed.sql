-- Contas locais deterministicas usadas por desenvolvimento e e2e.
-- Todas as contas usam a senha: seed123
INSERT INTO "User" ("id", "name", "email", "image", "createdAt", "updatedAt")
VALUES
  ('cmknadd9s0000jmsb075f9ziw', 'Mestre Seed', 'seed.user.1@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmkd5kjbj0000sbk92vwr25fp', 'Jogador Seed 2', 'seed.user.2@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm5pl8ae000004l79z7jtv4d', 'Jogador Seed 3', 'seed.user.3@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm6ed4fr000004l1khlscdo4', 'Jogador Seed 4', 'seed.user.4@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm6j0cs4000004k3l70wa6zg', 'Jogador Seed 5', 'seed.user.5@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm7mwopw000004jr04xkah49', 'Jogador Seed 6', 'seed.user.6@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm99f8gi000004jubjxyz6v3', 'Jogador Seed 7', 'seed.user.7@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00'),
  ('cmm6paz3d000004juybe2lpd4', 'Jogador Seed 8', 'seed.user.8@meg-pocket.local', NULL, TIMESTAMP '2026-03-18 00:00:00', TIMESTAMP '2026-03-18 00:00:00');

INSERT INTO "Account" ("id", "userId", "type", "provider", "providerAccountId", "access_token", "refresh_token", "expires_at", "token_type", "scope", "id_token", "password")
VALUES
  ('seed-account-1', 'cmknadd9s0000jmsb075f9ziw', 'credentials', 'credentials', 'seed.user.1@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-2', 'cmkd5kjbj0000sbk92vwr25fp', 'credentials', 'credentials', 'seed.user.2@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-3', 'cmm5pl8ae000004l79z7jtv4d', 'credentials', 'credentials', 'seed.user.3@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-4', 'cmm6ed4fr000004l1khlscdo4', 'credentials', 'credentials', 'seed.user.4@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-5', 'cmm6j0cs4000004k3l70wa6zg', 'credentials', 'credentials', 'seed.user.5@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-6', 'cmm7mwopw000004jr04xkah49', 'credentials', 'credentials', 'seed.user.6@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-7', 'cmm99f8gi000004jubjxyz6v3', 'credentials', 'credentials', 'seed.user.7@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha'),
  ('seed-account-8', 'cmm6paz3d000004juybe2lpd4', 'credentials', 'credentials', 'seed.user.8@meg-pocket.local', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$10$0LGXdI8LRixUo1PmkmCpWuFiuKAtnUxdqeOgtjAMYK6n1.NUWZmha');
