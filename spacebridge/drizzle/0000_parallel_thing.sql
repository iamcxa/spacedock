CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` text NOT NULL,
	`entity_path` text NOT NULL,
	`selected_text` text NOT NULL,
	`section_heading` text NOT NULL,
	`content` text NOT NULL,
	`author` text NOT NULL,
	`created_at` integer NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	`resolved_reason` text,
	`resolved_version` integer,
	`workflow_dir` text NOT NULL,
	`event_type` text,
	`aggregate_id` text,
	`sequence_number` integer,
	`payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comments_comment_id_unique` ON `comments` (`comment_id`);--> statement-breakpoint
CREATE TABLE `entity_leases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`session_id` text NOT NULL,
	`entity_slug` text NOT NULL,
	`role` text NOT NULL,
	`acquired_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`event_type` text,
	`aggregate_id` text,
	`sequence_number` integer,
	`payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_leases_token_unique` ON `entity_leases` (`token`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`entity` text NOT NULL,
	`stage` text NOT NULL,
	`agent` text NOT NULL,
	`timestamp` integer NOT NULL,
	`detail` text,
	`workflow_dir` text NOT NULL,
	`event_type` text,
	`aggregate_id` text,
	`sequence_number` integer,
	`payload` text
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`project_root` text NOT NULL,
	`pid` integer NOT NULL,
	`connected_at` integer NOT NULL,
	`last_heartbeat` integer NOT NULL,
	`event_type` text,
	`aggregate_id` text,
	`sequence_number` integer,
	`payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_id_unique` ON `sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `share_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`password_hash` text NOT NULL,
	`entity_paths` text NOT NULL,
	`stages` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`event_type` text,
	`aggregate_id` text,
	`sequence_number` integer,
	`payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_tokens_token_unique` ON `share_tokens` (`token`);