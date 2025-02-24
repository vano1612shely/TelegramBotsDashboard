import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotCategoryEntity } from '../bots/BotCategory';
import { BotEntity } from '../bots/Bot';

@Entity('client')
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  category_id: number;

  @ManyToOne(() => BotCategoryEntity, (category) => category.bots, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: BotCategoryEntity;

  @ManyToOne(() => BotCategoryEntity, (category) => category.bots, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'bot_id' })
  bot: BotEntity;

  @Column({ nullable: true })
  bot_id: number;

  @Column({ nullable: true })
  category_name: string;

  @Column({ nullable: true })
  chat_id: number;
}
