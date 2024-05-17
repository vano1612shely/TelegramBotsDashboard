import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @OneToMany(() => ClientEntity, (client) => client.category)
  clients: ClientEntity[];

  @Column({ nullable: true })
  text: string;

  @Column()
  image_link: string;
}
