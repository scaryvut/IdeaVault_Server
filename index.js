const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const {
  MongoClient,
  ObjectId,
  ServerApiVersion,
} = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ================= MIDDLEWARE =================


app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(express.json());

// ================= JWT VERIFY =================

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Invalid token",
      });
    }

    req.user = decoded;

    next();
  });
};

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
    await client.connect();

    console.log("MongoDB Connected");

    const db = client.db("ideaVault");

    const ideaCollection = db.collection("idea");
    const commentCollection = db.collection("comments");

    // =================================================
    // CREATE JWT
    // =================================================

    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.send({ token });
    });

    // =================================================
    // CREATE IDEA
    // =================================================

    app.post("/ideas", verifyToken, async (req, res) => {
      try {
        const idea = {
          ...req.body,
          userEmail: req.user.email,
          likes: 0,
          views: 0,
          createdAt: new Date(),
        };

        const result = await ideaCollection.insertOne(idea);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to create idea",
        });
      }
    });

    // =================================================
    // GET IDEAS
    // =================================================

    app.get("/ideas", async (req, res) => {
      try {
        const result = await ideaCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch ideas",
        });
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
        res.status(500).send({
          message: "Failed trending ideas",
        });
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
        res.status(500).send({
          message: "Invalid idea id",
        });
      }
    });

    // =================================================
    // DELETE IDEA
    // =================================================

    app.delete("/ideas/:id", verifyToken, async (req, res) => {
      try {
        const idea = await ideaCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        // OWNER CHECK
        if (idea.userEmail !== req.user.email) {
          return res.status(403).send({
            message: "Forbidden access",
          });
        }

        const result = await ideaCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to delete idea",
        });
      }
    });

    // =================================================
    // UPDATE IDEA
    // =================================================

    app.patch("/ideas/:id", verifyToken, async (req, res) => {
      try {
        const idea = await ideaCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        // OWNER CHECK
        if (idea.userEmail !== req.user.email) {
          return res.status(403).send({
            message: "Forbidden access",
          });
        }

        const result = await ideaCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: req.body,
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to update idea",
        });
      }
    });

    // =================================================
    // LIKE IDEA
    // =================================================

    app.patch("/ideas/:id/like", async (req, res) => {
      try {
        const result = await ideaCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $inc: {
              likes: 1,
            },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed like",
        });
      }
    });

    // =================================================
    // VIEW IDEA
    // =================================================

    app.patch("/ideas/:id/view", async (req, res) => {
      try {
        await ideaCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
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
        res.status(500).send({
          message: "Failed views",
        });
      }
    });

    // =================================================
    // GET COMMENTS
    // =================================================

    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const result = await commentCollection
          .find({
            ideaId: req.params.ideaId,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed comments",
        });
      }
    });

    // =================================================
    // ADD COMMENT
    // =================================================

    app.post("/comments", verifyToken, async (req, res) => {
      try {
        const comment = {
          ...req.body,
          userEmail: req.user.email,
          createdAt: new Date(),
        };

        const result = await commentCollection.insertOne(comment);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed add comment",
        });
      }
    });

    // =================================================
    // USER COMMENTS
    // =================================================

    app.get("/comments/user/:email", verifyToken, async (req, res) => {
      try {
        if (req.params.email !== req.user.email) {
          return res.status(403).send({
            message: "Forbidden access",
          });
        }

        const comments = await commentCollection
          .find({
            userEmail: req.params.email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(comments);
      } catch (error) {
        res.status(500).send({
          message: "Failed user comments",
        });
      }
    });

    // =================================================
    // UPDATE COMMENT
    // =================================================

    app.patch("/comments/:id", verifyToken, async (req, res) => {
      try {
        const comment = await commentCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        // OWNER CHECK
        if (comment.userEmail !== req.user.email) {
          return res.status(403).send({
            message: "Forbidden access",
          });
        }

        const result = await commentCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: {
              text: req.body.text,
              updatedAt: new Date(),
            },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed update comment",
        });
      }
    });

    // =================================================
    // DELETE COMMENT
    // =================================================

    app.delete("/comments/:id", verifyToken, async (req, res) => {
      try {
        const comment = await commentCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        // OWNER CHECK
        if (comment.userEmail !== req.user.email) {
          return res.status(403).send({
            message: "Forbidden access",
          });
        }

        const result = await commentCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed delete comment",
        });
      }
    });

  } catch (error) {
    console.log("DB CONNECTION ERROR:", error);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});