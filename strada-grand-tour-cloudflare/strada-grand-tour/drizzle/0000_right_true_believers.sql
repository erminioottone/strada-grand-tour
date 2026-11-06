CREATE TABLE `players` (
	`room` text NOT NULL,
	`slot` integer NOT NULL,
	`token` text NOT NULL,
	`car` integer NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`speed` real DEFAULT 0 NOT NULL,
	`elapsed` real,
	`finished` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`room`, `slot`),
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`start` integer,
	`status` text DEFAULT 'waiting' NOT NULL
);
