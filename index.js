require('dotenv').config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

app.use(express.json());

app.get("/edit", async (req, res) => {
  const { url, prompt } = req.query;

  if (!url || !prompt) {
    return res.status(400).json({ error: "Please provide both 'url' and 'prompt' query parameters." });
  }

  try {
    // Create prediction
    const createResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "c8c21a04a46cfb0c4d4f920b9e3c9c8329a2e39152053bb55ec25e9657d450fc", // InstructPix2Pix
        input: {
          image: url,
          prompt: prompt,
        },
      },
      {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const predictionId = createResponse.data.id;

    // Polling for result
    let predictionResult = createResponse.data;

    while (
      predictionResult.status !== "succeeded" &&
      predictionResult.status !== "failed"
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
        }
      );
      predictionResult = statusResponse.data;
    }

    if (predictionResult.status === "succeeded") {
      return res.json({ edited_image: predictionResult.output[0] });
    } else {
      return res.status(500).json({ error: "Image editing failed." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error. Try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
