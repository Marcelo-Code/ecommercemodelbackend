import { createClient } from "@supabase/supabase-js";

import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_DB_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseKey);

export const createPurchaseOrder = async (cart, buyer) => {
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  try {
    const date = new Date();

    // Crear orden de compra principal
    const { data: order, error } = await supabaseClient
      .from("purchase_orders")
      .insert({
        date,
        buyer_name: buyer.buyer_name,
        buyer_last_name: buyer.buyer_last_name,
        buyer_address: buyer.buyer_address,
        buyer_phone_number: buyer.buyer_phone_number,
        buyer_email: buyer.buyer_email,
        total_price: totalPrice,
        status: "pendiente",
      })
      .select()
      .single();

    if (error) throw error;

    // Insertar ítems de la orden
    const orderItems = cart.map((item) => ({
      purchase_order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseClient
      .from("purchase_orders_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return {
      status: 200,
      message: "Orden creada con éxito",
      data: {
        date,
        order_id: order.id,
        buyer,
        totalPrice,
        cart,
      },
    };
  } catch (error) {
    return {
      status: 500,
      message: "Error al crear la orden",
      error,
    };
  }
};
