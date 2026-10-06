CREATE TABLE `community_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(40) NOT NULL,
	`ownerId` int NOT NULL,
	`payloadJson` longtext NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_reactions` (
	`itemId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'like',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_reactions_itemId_userId_type_pk` PRIMARY KEY(`itemId`,`userId`,`type`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_followerId_followingId_pk` PRIMARY KEY(`followerId`,`followingId`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_groupId_userId_pk` PRIMARY KEY(`groupId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`privacy` varchar(20) NOT NULL DEFAULT 'public',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `community_comments_item_idx` ON `community_comments` (`itemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_items_kind_idx` ON `community_items` (`kind`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_items_owner_idx` ON `community_items` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_reactions_item_idx` ON `community_reactions` (`itemId`);--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`,`isRead`,`createdAt`);