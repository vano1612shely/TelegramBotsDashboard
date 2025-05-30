import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotCategoryEntity } from '../bots/BotCategory';
import { BotEntity } from '../bots/Bot';

@Entity('client')
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
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

  @ManyToMany(() => BotEntity, (bot) => bot.clients, {
    cascade: true,
  })
  @JoinTable({
    name: 'client_bot', // назва таблиці зв'язку
    joinColumn: {
      name: 'client_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'bot_id',
      referencedColumnName: 'id',
    },
  })
  bots: BotEntity[];

  @Column({ nullable: true })
  category_name: string;

  @Column({ nullable: true })
  chat_id: string;
}
