import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotCategoryEntity } from './BotCategory';
import { ClientEntity } from '../clients/Client';

@Entity('Bot')
export class BotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  token: string;

  @Column({ default: true })
  startWithServer: boolean;

  @Column()
  category_id: number;
  @OneToMany(() => ClientEntity, (client) => client.category, {
    onDelete: 'SET NULL',
  })
  clients: ClientEntity[];
  @ManyToOne(() => BotCategoryEntity, (category) => category.bots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: BotCategoryEntity;
}
