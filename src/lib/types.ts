// Tipi allineati allo schema Supabase

export interface Product {
  name: string;
  colors: string[];
  sizes: string[];
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  products: Product[];
  is_active: boolean;
  created_at: string;
}

export type GiftStatus = "sent" | "opened" | "completed" | "shipped";

export interface Gift {
  id: string;
  campaign_id: string;
  brand_id: string;
  token: string;
  instagram_handle: string;
  product_name: string | null;
  selected_color: string | null;
  selected_size: string | null;
  address_name: string | null;
  address_line: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string | null;
  status: GiftStatus;
  posted: boolean | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Risultato della funzione get_gift_by_token (vista creator)
export interface GiftPublicView {
  id: string;
  campaign_id: string;
  brand_name: string;
  brand_logo: string | null;
  products: Product[];
  product_name: string | null;
  status: GiftStatus;
  expires_at: string | null;
}
