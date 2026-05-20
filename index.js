const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    console.log("MongoDB Connected");

    const db = client.db("ideaVault");

    const ideaCollection = db.collection("idea");
    const commentCollection = db.collection("comments");

    // ================= TRENDING IDEAS =================
    // IMPORTANT: PLACE THIS BEFORE /ideas/:id

    app.get("/ideas/limit", async (req, res) => {
      try {
        const result = await ideaCollection
          .find()
          .limit(6)
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch trending ideas",
        });
      }
    });

    // ================= ALL IDEAS =================

    app.get("/ideas", async (req, res) => {
      try {
        const data = await ideaCollection.find().toArray();

        res.send(data);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch ideas",
        });
      }
    });
app.get("/comments/user/:userName", async (req, res) => {
  try {
    const comments = await commentCollection
      .find({ userName: req.params.userName })
      .toArray();

    const enriched = await Promise.all(
      comments.map(async (c) => {
        const idea = await ideaCollection.findOne({
          _id: new ObjectId(c.ideaId),
        });

        return {
          ...c,
          ideaTitle: idea?.title || "Unknown Idea",
        };
      })
    );

    res.send(enriched);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch comments" });
  }
});
app.get("/ideas/user/:userName", async (req, res) => {
  try {
    const data = await ideaCollection
      .find({ userName: req.params.userName })
      .toArray();

    res.send(data);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch user ideas" });
  }
});
app.delete("/ideas/:id", async (req, res) => {
  const result = await ideaCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.send(result);
});
app.patch("/ideas/:id", async (req, res) => {
  const result = await ideaCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );

  res.send(result);
});

    // ================= SINGLE IDEA =================

    app.get("/ideas/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const data = await ideaCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(data);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Invalid idea id",
        });
      }
    });

    // ================= LIKE IDEA =================

    app.patch("/ideas/:id/like", async (req, res) => {
      try {
        const result = await ideaCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $inc: {
              likes: 1,
            },
          }
        );

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to like idea",
        });
      }
    });

    // ================= VIEW IDEA =================

    app.patch("/ideas/:id/view", async (req, res) => {
      try {
        await ideaCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $inc: {
              views: 1,
            },
          }
        );

        res.send({
          success: true,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to update views",
        });
      }
    });

    // ================= GET COMMENTS =================

    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const data = await commentCollection
          .find({
            ideaId: req.params.ideaId,
          })
          .toArray();

        res.send(data);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch comments",
        });
      }
    });

    // ================= ADD COMMENT =================

    app.post("/comments", async (req, res) => {
      try {
        const result = await commentCollection.insertOne({
          ...req.body,
          createdAt: new Date(),
        });

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to add comment",
        });
      }
    });

    // ================= EDIT COMMENT =================

    app.patch("/comments/:id", async (req, res) => {
      try {
        const { text } = req.body;

        const result = await commentCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: {
              text,
              updatedAt: new Date(),
            },
          }
        );

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to update comment",
        });
      }
    });

    // ================= DELETE COMMENT =================

    app.delete("/comments/:id", async (req, res) => {
      try {
        const result = await commentCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to delete comment",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});