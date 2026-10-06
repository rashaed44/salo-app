CREATE TABLE `app_states` (
	`userId` int NOT NULL,
	`stateJson` longtext NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_states_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `legacy_sessions` (
	`token` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legacy_sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int,
	`channelId` varchar(64),
	`text` text,
	`imageUrl` text,
	`replyToId` int,
	`editedAt` timestamp,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `status` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
CREATE INDEX `legacy_sessions_user_idx` ON `legacy_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `legacy_sessions_expiry_idx` ON `legacy_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `messages_direct_idx` ON `messages` (`senderId`,`recipientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`channelId`,`createdAt`);