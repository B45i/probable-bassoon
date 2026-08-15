PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_conversions` (
	`site_key` text NOT NULL,
	`visitor_id` text NOT NULL,
	`goal_key` text NOT NULL,
	`first_ts` integer NOT NULL,
	PRIMARY KEY(`site_key`, `visitor_id`, `goal_key`)
);
--> statement-breakpoint
INSERT INTO `__new_conversions`("site_key", "visitor_id", "goal_key", "first_ts") SELECT "site_id", "visitor_id", "goal_key", "first_ts" FROM `conversions`;--> statement-breakpoint
DROP TABLE `conversions`;--> statement-breakpoint
ALTER TABLE `__new_conversions` RENAME TO `conversions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;