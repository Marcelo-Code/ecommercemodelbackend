import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mercadopago from "mercadopago";

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
    const { cart, payer } = req.body;

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
      payer,
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
    res.status(500).json({
      status: "error",
      mensaje: "No se pudo crear la preferencia",
      data: null,
    });
  }
});

// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en puerto ${PORT}`);
// });

export default app;
