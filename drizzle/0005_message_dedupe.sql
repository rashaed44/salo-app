ALTER TABLE `messages` ADD `clientMessageId` varchar(80);--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_client_id_unique` UNIQUE(`senderId`,`clientMessageId`);