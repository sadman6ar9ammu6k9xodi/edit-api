const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(require("cors")());

// Replace with your Replicate API Token
const replicateToken = "YOUR_REPLICATE_API_TOKEN";

app.get("/edit", async (req, res) => {
  const { url, prompt } = req.query;

  if (!url || !prompt) {
    return res.status(400).json({ error: "Missing image url or prompt." });
  }

  try {
    const response = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "REPLICATE_MODEL_VERSION_ID", // e.g. of a model like "pix2pix" or "image-to-image"
        input: {
          image: url,
          prompt: prompt
        }
      },
      {
        headers: {
          Authorization: `Token ${replicateToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Poll the prediction until it’s done
    const prediction = response.data;
    let result = prediction;
    while (
      result.status !== "succeeded" &&
      result.status !== "failed"
    ) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await axios.get(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${replicateToken}`
          }
        }
      );
      result = check.data;
    }

    if (result.status === "succeeded") {
      return res.json({ image: result.output[0] });
    } else {
      return res.status(500).json({ error: "Generation failed" });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
