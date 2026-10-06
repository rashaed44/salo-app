CREATE TABLE `channel_memberships` (
	`channelId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `channel_memberships_channelId_userId_pk` PRIMARY KEY(`channelId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `channel_memberships_user_idx` ON `channel_memberships` (`userId`);