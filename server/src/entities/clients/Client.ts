import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotCategoryEntity } from '../bots/BotCategory';

@Entity('client')
export class ClientEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
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

  @Column({ nullable: true })
  category_name: string;
}
