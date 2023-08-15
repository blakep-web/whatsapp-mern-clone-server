// importing
import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Pusher from 'pusher';
import helmet from 'helmet';
import cors from 'cors';

// app config
const app = express();
const port = process.env.PORT || 5174

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS:  process.env.PUSHER_TLS
  });

// middlewares
app.use(express.json());
app.use(cors());


// DB config
const db_url = process.env.DATABASE_URL
mongoose.connect(db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// change stream
const db = mongoose.connection

db.once('open', () => {
    const msgCollection = db.collection('messagecontents');
    const changeStream = msgCollection.watch();

    changeStream.on("change", (change) => {
        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted', {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            })
        } else {
            console.log("Error triggering Pusher");
        }
    })
})

// api routes
// app.get('/', (req, res) => {
//     res.status(200).send('Hello World');
// });

app.get('/messages/sync', async (req, res) => {
    const data = await Messages.find({});
    if (data) {
        res.status(201).send(data);
    } 
});

app.post('/messages/new', async (req, res) => {
    const dbMessage = req.body

    const data = await Messages.create(dbMessage)
    if (data) {
        res.status(201).send(data);
    }
});

//listener
app.listen(port, () => {
    console.log(`Listening on localhost:${port}`);
})