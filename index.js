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
    console.log("Missing URL or prompt");
    return res.status(400).json({ error: "Please provide both 'url' and 'prompt' query parameters." });
  }

  console.log("Request received with:", { url, prompt });

  try {
    // Step 1: Send request to Replicate
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

    console.log("Prediction created:", createResponse.data);

    const predictionId = createResponse.data.id;
    let predictionResult = createResponse.data;

    // Step 2: Polling until done
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
      console.log("Polling result:", predictionResult.status);
    }

    // Step 3: Send final output
    if (predictionResult.status === "succeeded") {
      console.log("Success! Output:", predictionResult.output[0]);
      return res.json({ edited_image: predictionResult.output[0] });
    } else {
      console.log("Prediction failed.");
      return res.status(500).json({ error: "Image editing failed." });
    }
  } catch (error) {
    console.error("Replicate error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Server error. Try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`ULLASH edit api Server running on port ${PORT}`);
});
