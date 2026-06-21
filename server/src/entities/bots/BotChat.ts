import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BotCategoryEntity } from './BotCategory';

/**
 * Broadcast target (group chat or channel) for a category.
 *
 * `identifier` is either a numeric chat id (e.g. `-1001234567890` for a
 * supergroup/channel, `-123456789` for a basic group) or a public channel
 * username in `@username` form. Bots that belong to the same category are
 * expected to be added as administrators in these chats/channels manually in
 * Telegram; at send time we pick whichever bot is able to post.
 */
@Entity('BotChat')
@Unique(['category_id', 'identifier'])
export class BotChatEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identifier: string;

  @Column({ nullable: true })
  title: string;

  // 'channel' | 'group'
  @Column({ default: 'channel' })
  type: string;

  @Column()
  category_id: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => BotCategoryEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: BotCategoryEntity;
}
