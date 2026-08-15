CREATE TABLE `conversions` (
	`site_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`goal_key` text NOT NULL,
	`first_ts` integer NOT NULL,
	PRIMARY KEY(`site_id`, `visitor_id`, `goal_key`)
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`salt` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`traffic_bp` integer DEFAULT 10000 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiments_site_id_key_unique` ON `experiments` (`site_id`,`key`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_api_key_unique` ON `sites` (`api_key`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`key` text NOT NULL,
	`weight_bp` integer NOT NULL,
	`is_control` integer DEFAULT false NOT NULL,
	`content` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_experiment_id_key_unique` ON `variants` (`experiment_id`,`key`);