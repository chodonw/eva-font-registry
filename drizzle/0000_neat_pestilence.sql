CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`subject_id` text,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `registry_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_created` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_events_actor` ON `audit_events` (`actor_id`);--> statement-breakpoint
CREATE TABLE `font_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`sha256` text NOT NULL,
	`source_path` text NOT NULL,
	`family` text NOT NULL,
	`subfamily` text,
	`postscript_name` text,
	`format` text NOT NULL,
	`face_index` integer DEFAULT 0 NOT NULL,
	`file_size` integer NOT NULL,
	`license_status` text DEFAULT 'review' NOT NULL,
	`publish_status` text DEFAULT 'raw' NOT NULL,
	`license_text` text,
	`license_url` text,
	`raw_key` text NOT NULL,
	`public_key` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `registry_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_font_assets_family` ON `font_assets` (`family`);--> statement-breakpoint
CREATE INDEX `idx_font_assets_license_status` ON `font_assets` (`license_status`);--> statement-breakpoint
CREATE INDEX `idx_font_assets_publish_status` ON `font_assets` (`publish_status`);--> statement-breakpoint
CREATE TABLE `registry_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `registry_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_registry_sessions_user` ON `registry_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_registry_sessions_expiry` ON `registry_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `registry_users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
