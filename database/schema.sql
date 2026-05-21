-- Время хоккея — полная схема (InnoDB, utf8mb4)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_login VARCHAR(64) NULL,
  favorite_team VARCHAR(32) NULL COMMENT 'slug команды КХЛ',
  role ENUM('super', 'admin', 'player') NOT NULL DEFAULT 'player',
  position ENUM('player', 'goalie') NOT NULL DEFAULT 'player',
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_phone (phone),
  UNIQUE KEY uk_users_display_login (display_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rosters (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  venue VARCHAR(128) NULL,
  weekday TINYINT UNSIGNED NULL COMMENT '0=Вс .. 6=Сб, 3=Ср',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roster_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  roster_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  position ENUM('player', 'goalie') NOT NULL DEFAULT 'player',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roster_members (roster_id, user_id),
  CONSTRAINT fk_roster_members_roster FOREIGN KEY (roster_id) REFERENCES rosters (id) ON DELETE CASCADE,
  CONSTRAINT fk_roster_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS day_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  roster_id INT UNSIGNED NOT NULL,
  group_date DATE NOT NULL,
  title VARCHAR(128) NULL,
  vote_active TINYINT(1) NOT NULL DEFAULT 0,
  payment_active TINYINT(1) NOT NULL DEFAULT 0,
  vote_ends_at DATETIME NULL,
  vote_label_1 VARCHAR(64) NULL,
  vote_label_2 VARCHAR(64) NULL,
  vote_label_3 VARCHAR(64) NULL,
  vote_go_option TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1|2|3 — какой ответ = еду',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roster_date (roster_id, group_date),
  CONSTRAINT fk_day_groups_roster FOREIGN KEY (roster_id) REFERENCES rosters (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  group_id INT UNSIGNED NOT NULL,
  actual TINYINT(1) NOT NULL DEFAULT 0,
  queue_position INT UNSIGNED NULL,
  is_guest TINYINT(1) NOT NULL DEFAULT 0,
  excluded TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_group_members_user_group (user_id, group_id),
  KEY idx_group_members_group (group_id),
  CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES day_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS votes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  group_id INT UNSIGNED NOT NULL,
  choice TINYINT UNSIGNED NOT NULL DEFAULT 1,
  voted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_votes_user_group (user_id, group_id),
  KEY idx_votes_group_voted (group_id, voted_at),
  CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_group FOREIGN KEY (group_id) REFERENCES day_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  group_id INT UNSIGNED NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_user_group (user_id, group_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_group FOREIGN KEY (group_id) REFERENCES day_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(512) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_push_endpoint (endpoint(191)),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
