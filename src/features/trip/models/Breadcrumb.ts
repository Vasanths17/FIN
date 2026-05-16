import { Model } from '@nozbe/watermelondb';
import { field, relation, date } from '@nozbe/watermelondb/decorators';
import type Trip from './Trip';

export default class Breadcrumb extends Model {
  static table = 'breadcrumbs';
  static associations = {
    trips: { type: 'belongs_to' as const, key: 'trip_id' },
  };

  @field('trip_id') tripId!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('speed') speed!: number;
  @field('heading') heading!: number;
  @field('accuracy') accuracy!: number;
  @date('timestamp') timestamp!: Date;

  @relation('trips', 'trip_id') trip!: Trip;
}
