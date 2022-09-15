import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();
import http from 'http';
const server = http.createServer(app);
import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }});

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler


const client = new Client("chatlog");
client.connect();

io.on("connection", (socket) => {
  console.log("a user connected");
})

app.get("/all", async (req, res) => {
  const dbres = await client.query('select * from messages');
  res.json(dbres.rows);
});

app.post("/message", async (req, res) => {
  try {
    const message = req.body.message;
    const dbres = await client.query('insert into messages(message) values($1) returning *', [message])
    res.json(dbres.rows);
    const allMessages = await client.query('select * from messages')
    io.emit("messages updated", { allMessages: allMessages.rows});
  } catch (error) {
    console.error(error);
  }
})


//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
server.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
