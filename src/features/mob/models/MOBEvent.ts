import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class MOBEvent extends Model {
  static table = 'mob_events';

  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('crew_member_name') crewMemberName!: string;
  @field('rescued') rescued!: boolean;
  @date('rescued_at') rescuedAt!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
}
