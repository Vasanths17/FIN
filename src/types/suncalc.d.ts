declare module 'suncalc' {
  export function getMoonIllumination(date: Date): {
    fraction: number;
    phase: number;
    angle: number;
  };
  export function getMoonTimes(
    date: Date,
    lat: number,
    lng: number,
  ): {
    rise: Date;
    set: Date;
    alwaysUp?: boolean;
    alwaysDown?: boolean;
  };
  export function getMoonPosition(
    date: Date,
    lat: number,
    lng: number,
  ): {
    azimuth: number;
    altitude: number;
    distance: number;
    parallacticAngle: number;
  };
  export function getSunPosition(
    date: Date,
    lat: number,
    lng: number,
  ): {
    azimuth: number;
    altitude: number;
  };
  export function getTimes(
    date: Date,
    lat: number,
    lng: number,
  ): Record<string, Date>;
}
