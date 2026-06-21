import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BotEntity } from './Bot';

/**
 * A chat/channel that a particular bot has "discovered" through Telegram
 * updates.
 *
 * The Bot API has no method to list the chats a bot belongs to, so we
 * accumulate them as the bot receives updates: when it is added/promoted/removed
 * (`my_chat_member`) or when it sees a message/post in a group or channel. This
 * pool powers the autocomplete on the send-message screen.
 *
 * `status` mirrors the bot's membership in the chat (creator / administrator /
 * member / left / kicked) so the UI can suggest only chats the bot can actually
 * post to.
 */
@Entity('DiscoveredChat')
@Unique(['bot_id', 'chat_id'])
export class DiscoveredChatEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bot_id: number;

  @Column()
  category_id: number;

  // Numeric Telegram chat id stored as string (e.g. "-1001234567890").
  @Column()
  chat_id: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  username: string;

  // 'group' | 'supergroup' | 'channel'
  @Column({ nullable: true })
  type: string;

  // 'creator' | 'administrator' | 'member' | 'left' | 'kicked'
  @Column({ default: 'member' })
  status: string;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => BotEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bot_id' })
  bot: BotEntity;
}
