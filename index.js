const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ================= MIDDLEWARE =================

app.use(
  cors()
);

app.use(express.json());

// ================= DB =================

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //await client.connect();

  

    const db = client.db("ideaVault");

    const ideaCollection = db.collection("idea");
    const commentCollection = db.collection("comments");

    // =================================================
    // CREATE IDEA
    // =================================================

    app.post("/ideas", async (req, res) => {
      try {
        const idea = {
          ...req.body,
          likes: 0,
          views: 0,
          createdAt: new Date(),
        };

        const result = await ideaCollection.insertOne(idea);

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Failed to create idea" });
      }
    });

    // =================================================
    // GET IDEAS
    // =================================================

    app.get("/ideas", async (req, res) => {
      try {
        const { userEmail } = req.query;

        const query = userEmail ? { userEmail } : {};

        const result = await ideaCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch ideas" });
      }
    });

    // =================================================
    // TRENDING IDEAS
    // =================================================

    app.get("/ideas/limit", async (req, res) => {
      try {
        const result = await ideaCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed trending ideas" });
      }
    });

    // =================================================
    // SINGLE IDEA
    // =================================================

    app.get("/ideas/:id", async (req, res) => {
      try {
        const result = await ideaCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Invalid idea id" });
      }
    });

    // =================================================
    // DELETE IDEA (NO AUTH)
    // =================================================

    app.delete("/ideas/:id", async (req, res) => {
      try {
        const result = await ideaCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete idea" });
      }
    });

    // =================================================
    // UPDATE IDEA (NO AUTH)
    // =================================================

    app.patch("/ideas/:id", async (req, res) => {
      try {
        const result = await ideaCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update idea" });
      }
    });

    // =================================================
    // LIKE IDEA
    // =================================================

    app.patch("/ideas/:id/like", async (req, res) => {
      try {
        const result = await ideaCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $inc: { likes: 1 } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed like" });
      }
    });

    // =================================================
    // VIEW IDEA
    // =================================================

    app.patch("/ideas/:id/view", async (req, res) => {
      try {
        await ideaCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $inc: { views: 1 } }
        );

        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ message: "Failed views" });
      }
    });

    // =================================================
    // GET COMMENTS
    // =================================================

    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const result = await commentCollection
          .find({ ideaId: req.params.ideaId })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed comments" });
      }
    });
    app.get("/comments/user/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await commentCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to get user comments" });
  }
});

    // =================================================
    // ADD COMMENT (NO AUTH)
    // =================================================

    app.post("/comments", async (req, res) => {
      try {
        const { ideaId, text, userEmail } = req.body;

        if (!ideaId || !text) {
          return res
            .status(400)
            .send({ message: "ideaId and text are required" });
        }

        const comment = {
          ideaId,
          text,
          userEmail: userEmail || "anonymous",
          createdAt: new Date(),
        };

        const result = await commentCollection.insertOne(comment);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed add comment" });
      }
    });

    // =================================================
    // UPDATE COMMENT (NO AUTH)
    // =================================================

    app.patch("/comments/:id", async (req, res) => {
      try {
        const result = await commentCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $set: {
              text: req.body.text,
              updatedAt: new Date(),
            },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed update comment" });
      }
    });

    // =================================================
    // DELETE COMMENT (NO AUTH)
    // =================================================

    app.delete("/comments/:id", async (req, res) => {
      try {
        const result = await commentCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed delete comment" });
      }
    });
      console.log("MongoDB Connected");
  } catch (error) {
    console.log("DB CONNECTION ERROR:", error);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});