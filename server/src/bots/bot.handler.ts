import { Injectable } from '@nestjs/common';
import { BotType } from '../types/BotTypes';
import { Markup } from 'telegraf';
import { ClientsService } from '../clients/clients.service';
import { CreateClientDto } from '../clients/dto/create-user.dto';

@Injectable()
export class BotsHandler {
  constructor(private readonly clientsService: ClientsService) {}

  async start(bot: BotType) {
    bot.botInstance.start(async (ctx) => {
      try {
        const data: CreateClientDto = {
          name: `${ctx.message.from.first_name ? ctx.message.from.first_name : ''}${ctx.message.from.last_name ? ' ' + ctx.message.from.last_name : ''}`,
          username: ctx.message.from.username,
          category_id: bot.category_id,
          chat_id: ctx.message.from.id,
          bot_id: bot.id,
        };
        await this.clientsService.create(data);

        const buttons = [];
        bot.category.buttons.map((button) => {
          buttons.push([Markup.button.url(button.title, button.link)]);
        });
        console.log('test', bot)
        await ctx.sendPhoto(
          { url: bot.category.image_link },
          {
            caption: bot.category.text,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons),
          },
        );
      } catch (e) {
        console.log(e);
      }
    });
  }

  async addAllHandlers(bot: BotType) {
    await this.start(bot);
  }
}
