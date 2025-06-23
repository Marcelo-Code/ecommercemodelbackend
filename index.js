import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mercadopago from "mercadopago";
import { createPurchaseOrder } from "./functions.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const SUCCESS_BACKEND_URL = process.env.SUCCESS_BACKEND_URL;
const FAILURE_BACKEND_URL = process.env.FAILURE_BACKEND_URL;
const PENDING_BACKEND_URL = process.env.PENDING_BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: FRONTEND_URL,
  })
);
app.use(express.json());

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/createPreference", async (req, res) => {
  try {
    const { cart, formData } = req.body;

    const preference = {
      items: cart.map((item) => ({
        title: item.description,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      back_urls: {
        success: SUCCESS_BACKEND_URL,
        failure: FAILURE_BACKEND_URL,
        pending: PENDING_BACKEND_URL,
      },
      auto_return: "approved",
      currency_id: "ARS",
      payer: {
        email: formData.buyer_email,
      },
      notification_url: "https://ecommercemodelbackend.vercel.app/webhook",
      metadata: {
        cart,
        buyer: formData,
      },
    };

    const response = await mercadopago.preferences.create(preference);

    res.status(200).json({
      status: "success",
      mensaje: "Preferencia creada correctamente",
      data: {
        init_point: response.body.init_point,
        preference_id: response.body.id,
      },
    });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({
      status: "error",
      mensaje: "No se pudo crear la preferencia",
      data: null,
      error: error.message,
    });
  }
});

app.post("/webHook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const paymentId = data.id;

      // Consultar el pago a MP
      const payment = await mercadopago.payment.findById(paymentId);

      if (payment.body.status === "approved") {
        const { cart, buyer } = payment.body.metadata;

        if (!cart || !buyer) {
          console.warn("Metadata incompleta en el pago aprobado.");
        } else {
          const payment_id = payment.body.id;
          await createPurchaseOrder(cart, buyer, payment_id);
        }
      }
    }

    res.sendStatus(200); // siempre responde 200
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

app.get("/getReceipt", async (req, res) => {
  const { payment_id } = req.query;

  if (!payment_id) {
    return res.status(400).json({
      status: "error",
      message: "Falta el payment_id en la query",
    });
  }

  try {
    const payment = await mercadopago.payment.findById(payment_id);

    // Opcional: podés construir un link o devolver la info entera
    const receiptData = {
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      date_approved: payment.body.date_approved,
      transaction_amount: payment.body.transaction_amount,
      payment_method: payment.body.payment_method_id,
      payer: payment.body.payer,
      external_reference: payment.body.external_reference,
      order_id: payment.body.order?.id || null,
      receipt_url: payment.body.statement_descriptor || null, // Esto no es un link directo
    };

    res.status(200).json({
      status: "success",
      message: "Comprobante obtenido con éxito",
      data: receiptData,
    });
  } catch (error) {
    console.error("Error al obtener comprobante:", error);
    res.status(500).json({
      status: "error",
      message: "Error al consultar el comprobante",
      error: error.message,
    });
  }
});

// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en puerto ${PORT}`);
// });

export default app;
