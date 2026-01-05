
export interface Cabin {
  id: number;
  name: string;
  image: string | null; // Base64 string
}

export interface Reservation {
  id: string;
  cabinId: number;
  clientName: string;
  deposit: number;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string;   // ISO string YYYY-MM-DD
  notes?: string;
}

export type ViewType = 'calendar' | 'cabins' | 'insights';
