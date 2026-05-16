import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import type Breadcrumb from './Breadcrumb';

export default class Trip extends Model {
  static table = 'trips';
  static associations = {
    breadcrumbs: { type: 'has_many' as const, foreignKey: 'trip_id' },
  };

  @field('name') name!: string;
  @date('started_at') startedAt!: Date;
  @date('ended_at') endedAt!: Date | null;
  @field('distance_nm') distanceNm!: number;
  @field('avg_speed_knots') avgSpeedKnots!: number;
  @field('max_speed_knots') maxSpeedKnots!: number;
  @field('breadcrumb_count') breadcrumbCount!: number;
  @field('status') status!: string; // 'active' | 'completed'

  @children('breadcrumbs') breadcrumbs!: Breadcrumb[];
}
