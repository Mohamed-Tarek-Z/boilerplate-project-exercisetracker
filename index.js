const express = require('express')
const mongoose = require('mongoose')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    await user.save();
    res.json({ _id: user._id, username: user.username });
  } catch (err) {
    res.status(400).json({ error: 'Username must be unique or valid' });
  }
});


app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = {
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    };

    user.exercises.push(exercise);
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let log = user.exercises;

    // Optional date filtering
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate)) {
        log = log.filter(ex => ex.date >= fromDate);
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate)) {
        log = log.filter(ex => ex.date <= toDate);
      }
    }

    // Optional limit
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum)) {
        log = log.slice(0, limitNum);
      }
    }

    // Format date
    const formattedLog = log.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: formattedLog.length,
      log: formattedLog
    });

  } catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
