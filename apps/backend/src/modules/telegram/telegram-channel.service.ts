import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegramChannel, TelegramChannelDocument } from './schemas/telegram-channel.schema';
import { Metal } from '../gold-price/metal.types';

@Injectable()
export class TelegramChannelService {
  constructor(
    @InjectModel(TelegramChannel.name) private channelModel: Model<TelegramChannelDocument>,
  ) {}

  list(metal?: Metal): Promise<TelegramChannel[]> {
    return this.channelModel
      .find(metal ? { metal } : {})
      .sort({ metal: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  /** Enabled channels for a metal — the broadcast targets used by the scheduler. */
  listEnabled(metal: Metal): Promise<TelegramChannel[]> {
    return this.channelModel.find({ metal, enabled: true }).lean().exec();
  }

  /** Upserts a channel keyed on (channelId, metal). */
  upsert(data: Partial<TelegramChannel>): Promise<TelegramChannel> {
    return this.channelModel.findOneAndUpdate(
      { channelId: data.channelId, metal: data.metal || 'XAU' },
      { $set: data },
      { new: true, upsert: true },
    );
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const res = await this.channelModel.deleteOne({ _id: id });
    return { deleted: res.deletedCount > 0 };
  }
}
