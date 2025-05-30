import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
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
  chat_id: string;

  @ManyToMany(() => BotEntity, (bot) => bot.clients, {
    cascade: true,
  })
  @JoinTable({
    name: 'client_bot',
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

  @ManyToMany(() => BotCategoryEntity, (category) => category.clients, {
    cascade: true,
  })
  @JoinTable({
    name: 'client_category',
    joinColumn: {
      name: 'client_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'category_id',
      referencedColumnName: 'id',
    },
  })
  categories: BotCategoryEntity[];
}
