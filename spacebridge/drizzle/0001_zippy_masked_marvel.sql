CREATE TABLE `lease_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aggregate_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`timestamp` integer NOT NULL
);
