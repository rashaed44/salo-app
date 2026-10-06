CREATE TABLE `user_presence` (
	`sessionToken` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_presence_sessionToken` PRIMARY KEY(`sessionToken`)
);
--> statement-breakpoint
CREATE INDEX `user_presence_user_idx` ON `user_presence` (`userId`);--> statement-breakpoint
CREATE INDEX `user_presence_last_seen_idx` ON `user_presence` (`lastSeenAt`);
