import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class SOSLog extends Model {
  static table = 'sos_logs';

  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('speed') speed!: number;
  @field('heading') heading!: number;
  @field('contacts_notified') contactsNotified!: string;
  @field('status') status!: string;
  @readonly @date('created_at') createdAt!: Date;
}
