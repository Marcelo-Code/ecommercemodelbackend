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
        success: `${SUCCESS_BACKEND_URL}/${req.body.id}`,
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
    console.error("Error al crear preferencia:", error); // <-- útil para debugging

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

// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en puerto ${PORT}`);
// });

export default app;
