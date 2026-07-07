-- Shipyard schema: users, repos, builds, deployments, refresh_tokens
-- Run once against the `shipyard` database.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  github_id         BIGINT UNSIGNED NOT NULL,
  github_username   VARCHAR(255) NOT NULL,
  avatar_url        VARCHAR(512),
  -- GitHub OAuth token, used server-side to call the GitHub API on the user's behalf
  -- (list repos, create/remove webhooks). Never returned to the client.
  github_access_token TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_github_id (github_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  -- sha256 hex of the raw refresh token; the raw value is never stored
  token_hash   CHAR(64) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  revoked_at   TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NOT NULL,
  github_repo_id    BIGINT UNSIGNED NOT NULL,
  full_name         VARCHAR(255) NOT NULL,
  default_branch    VARCHAR(255) NOT NULL DEFAULT 'main',
  is_private        BOOLEAN NOT NULL DEFAULT FALSE,
  -- GitHub webhook id on this repo; needed to remove the hook on disconnect
  webhook_id        BIGINT UNSIGNED NULL,
  install_command   VARCHAR(512) NULL,
  build_command     VARCHAR(512) NULL,
  output_dir        VARCHAR(255) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_repos_user_github_repo (user_id, github_repo_id),
  CONSTRAINT fk_repos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS builds (
  id            CHAR(36) PRIMARY KEY,
  repo_id       INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  commit_sha    CHAR(40) NOT NULL,
  branch        VARCHAR(255) NOT NULL,
  status        ENUM('queued','running','success','failed','timeout','cancelled') NOT NULL DEFAULT 'queued',
  log           MEDIUMTEXT,
  error_message VARCHAR(1024) NULL,
  started_at    TIMESTAMP NULL,
  finished_at   TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_builds_repo (repo_id),
  KEY idx_builds_status (status),
  KEY idx_builds_created (created_at),
  CONSTRAINT fk_builds_repo FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
  CONSTRAINT fk_builds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deployments (
  id                  CHAR(36) PRIMARY KEY,
  build_id            CHAR(36) NOT NULL,
  repo_id             INT UNSIGNED NOT NULL,
  subdomain           VARCHAR(255) NOT NULL,
  s3_prefix           VARCHAR(512) NOT NULL,
  cloudflare_record_id VARCHAR(255) NULL,
  -- the currently-live deployment for a repo; older ones are cleanup candidates
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_deployments_subdomain (subdomain),
  KEY idx_deployments_repo (repo_id),
  KEY idx_deployments_current (is_current),
  CONSTRAINT fk_deployments_build FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
  CONSTRAINT fk_deployments_repo FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
