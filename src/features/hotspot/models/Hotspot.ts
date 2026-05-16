import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Hotspot extends Model {
  static table = 'hotspots';

  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('catch_type') catchType!: string;
  @field('notes') notes!: string;
  @field('rating') rating!: number;
  @readonly @date('created_at') createdAt!: Date;
}
