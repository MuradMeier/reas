export interface Region {
  id: number;
  nazvanie: string;
}

export interface City {
  id: number;
  nazvanie: string;
  region: number;
}

export interface District {
  id: number;
  nazvanie: string;
  city: number;
}

export interface MetroStation {
  id: number;
  nazvanie: string;
  city: number;
}

export type ObjectType = 'landplot' | 'apartment' | 'detachedhouse' | 'flat';

export interface SearchResult {
  id: number;
  type: ObjectType;
  title: string;
  price?: number;
  area?: number;
  rooms?: number;
  address: string;
  image?: string;
  apartment_number?: string;
  created_at?: string;
}
export interface Microdistrict {
  id: number;
  nazvanie: string;
  raion: number;
}
