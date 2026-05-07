export type DeliveryOrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type DeliveryOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  products?: {
    id: string;
    name: string;
    unit: string | null;
    image_url: string | null;
  } | null;
};

export type DeliveryOrder = {
  id: string;
  user_id: string;
  status: DeliveryOrderStatus;
  total: number;
  delivery_address: string;
  delivery_date: string;
  created_at: string;
  updated_at?: string;
  assigned_delivery_user_id?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  delivery_notes?: string | null;
  order_items?: DeliveryOrderItem[];
};

export type DeliveryProfile = {
  id: string;
  user_uuid: string;
  user_email: string;
  full_name?: string | null;
  phone?: string | null;
  user_type?: string | null;
};
