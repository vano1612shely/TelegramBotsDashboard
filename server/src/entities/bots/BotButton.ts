import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotCategoryEntity } from './BotCategory';

@Entity('BotButton')
export class BotButtonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  link: string;

  @Column()
  category_id: number;

  @ManyToOne(() => BotCategoryEntity, (category) => category.bots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: BotCategoryEntity;
}
