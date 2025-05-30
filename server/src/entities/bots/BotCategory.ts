import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BotEntity } from './Bot';
import { BotButtonEntity } from './BotButton';
import { ClientEntity } from '../clients/Client';

@Entity('BotCategory')
export class BotCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => BotEntity, (bot) => bot.category)
  bots: BotEntity[];

  @OneToMany(() => BotButtonEntity, (button) => button.category)
  buttons: BotButtonEntity[];

  @Column({ nullable: true })
  text: string;

  @Column()
  image_link: string;

  @ManyToMany(() => ClientEntity, (client) => client.categories)
  clients: ClientEntity[];
}
