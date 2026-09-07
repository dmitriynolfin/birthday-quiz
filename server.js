const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

let rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const defaultQuestions = [
  // === DUBAI QUESTIONS ===
  { 
    category: "🏙️ Dubai", 
    question: "What is the height of Burj Khalifa, the tallest building in the world?", 
    options: ["628 meters", "728 meters", "828 meters", "928 meters"], 
    correct: 2, 
    time: 15 
  },
  { 
    category: "🏙️ Dubai", 
    question: "What is special about Dubai's Palm Jumeirah?", 
    options: [
      "It's the largest artificial island in the world",
      "It's shaped like a palm tree and visible from space",
      "It has the world's largest hotel",
      "All of the above"
    ], 
    correct: 3, 
    time: 15 
  },
  { 
    category: "🏙️ Dubai", 
    question: "Which luxury cars does Dubai Police use?", 
    options: [
      "Only Toyota Camry",
      "Lamborghini, Ferrari, and Bugatti",
      "Tesla only",
      "BMW and Mercedes"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏙️ Dubai", 
    question: "What is unique about Dubai Mall?", 
    options: [
      "It has an indoor ski resort",
      "It has an aquarium with 33,000 sea animals",
      "It has over 1,200 stores",
      "All of the above"
    ], 
    correct: 3, 
    time: 15 
  },
  { 
    category: "🏙️ Dubai", 
    question: "What was Dubai's main industry before oil was discovered?", 
    options: [
      "Gold mining",
      "Fishing and pearl diving",
      "Textile manufacturing",
      "Agriculture"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏙️ Dubai", 
    question: "What is the name of the sail-shaped luxury hotel in Dubai?", 
    options: [
      "Atlantis The Palm",
      "Burj Al Arab",
      "Jumeirah Beach Hotel",
      "Armani Hotel"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏙️ Dubai", 
    question: "What is special about Dubai Metro?", 
    options: [
      "It's the fastest metro in the world",
      "It's the longest driverless metro network in the world",
      "It's completely free",
      "It runs on solar energy"
    ], 
    correct: 1, 
    time: 15 
  },
  { 
    category: "🏙️ Dubai", 
    question: "Where can you ski indoors in the middle of the desert?", 
    options: [
      "Dubai Ice Rink",
      "Ski Dubai at Mall of the Emirates",
      "Dubai Snow Park",
      "Winter Garden Dubai"
    ], 
    correct: 1, 
    time: 10 
  },
  
  // === MAGNITOGORSK QUESTIONS ===
  { 
    category: "🏭 Magnitogorsk", 
    question: "What is Magnitogorsk famous for?", 
    options: [
      "Being the capital of Russia",
      "One of the world's largest steel and iron plants (MMK)",
      "Having the largest university in Russia",
      "Being a major seaport"
    ], 
    correct: 1, 
    time: 15 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "What is unique about Magnitogorsk's location?", 
    options: [
      "It's located on two continents: Europe and Asia",
      "It's the southernmost city in Russia",
      "It's built entirely underground",
      "It's located on an active volcano"
    ], 
    correct: 0, 
    time: 15 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "When was Magnitogorsk founded?", 
    options: [
      "1750",
      "1850",
      "1930",
      "1950"
    ], 
    correct: 2, 
    time: 10 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "What does MMK stand for in Magnitogorsk?", 
    options: [
      "Magnitogorsk Medical complex",
      "Magnitogorsk Iron and Steel Works",
      "Magnitogorsk Metro system",
      "Magnitogorsk Music conservatory"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "What river flows through Magnitogorsk?", 
    options: [
      "Volga River",
      "Ural River",
      "Ob River",
      "Yenisei River"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "What is Magnitogorsk's nickname?", 
    options: [
      "City of Gold",
      "Steel Capital",
      "City of Eternal Summer",
      "Northern Venice"
    ], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "Approximately how many people live in Magnitogorsk?", 
    options: [
      "Around 100,000",
      "Around 200,000",
      "Around 400,000",
      "Around 1 million"
    ], 
    correct: 2, 
    time: 15 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "During which historical period was Magnitogorsk built?", 
    options: [
      "Tsarist Russia",
      "Soviet industrialization (First Five-Year Plan)",
      "Post-Soviet era",
      "World War II"
    ], 
    correct: 1, 
    time: 15 
  },
  { 
    category: "🏭 Magnitogorsk", 
    question: "What is the climate like in Magnitogorsk?", 
    options: [
      "Tropical",
      "Mediterranean",
      "Continental with cold winters",
      "Arctic"
    ], 
    correct: 2, 
    time: 10 
  },
  
  // === BIRTHDAY STAR PERSONAL QUESTIONS ===
  { 
    category: "🎂 Birthday Star", 
    question: "What is my favorite food?", 
    options: ["Pizza", "Sushi", "Burgers", "Pasta"], 
    correct: 1, 
    time: 10 
  },
  { 
    category: "🎂 Birthday Star", 
    question: "Where do I want to travel most?", 
    options: ["Japan", "Iceland", "Maldives", "Peru"], 
    correct: 0, 
    time: 10 
  },
  { 
    category: "🎂 Birthday Star", 
    question: "What would be my superpower?", 
    options: ["Flying", "Invisibility", "Time travel", "Super strength"], 
    correct: 2, 
    time: 10 
  },
  { 
    category: "🎂 Birthday Star", 
    question: "What's my favorite season?", 
    options: ["Winter", "Spring", "Summer", "Autumn"], 
    correct: 3, 
    time: 10 
  }
];

app.post('/api/create-room', async (req, res) => {
  const roomCode = generateRoomCode();
  const { hostName, questions } = req.body;
  rooms[roomCode] = {
    code: roomCode, 
    hostName: hostName || 'Host', 
    questions: questions || defaultQuestions,
    players: {}, 
    currentQuestion: -1, 
    gameState: 'lobby', 
    scores: {}, 
    questionScores: []
  };
  const qrCode = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/join/${roomCode}`);
  res.json({ roomCode, qrCode });
});

app.get('/api/room/:code', (req, res) => {
  const room = rooms[req.params.code];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ 
    roomCode: room.code, 
    hostName: room.hostName, 
    playerCount: Object.keys(room.players).length, 
    gameState: room.gameState 
  });
});

// Чистые маршруты без .html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/join', (req, res) => res.sendFile(path.join(__dirname, 'public', 'join.html')));
app.get('/join/:code', (req, res) => res.sendFile(path.join(__dirname, 'public', 'join.html')));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error', 'Room not found');
    
    room.players[socket.id] = { 
      id: socket.id, 
      name: playerName, 
      avatar: `🎮${Math.floor(Math.random() * 99)}` 
    };
    
    socket.join(roomCode);
    socket.emit('joined-success', { playerId: socket.id, roomCode, playerName });
    
    io.to(roomCode).emit('players-update', { 
      players: Object.values(room.players), 
      playerCount: Object.keys(room.players).length 
    });
  });

  socket.on('start-game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.gameState = 'playing';
    room.currentQuestion = 0;
    room.scores = {};
    room.questionScores = [];
    
    Object.keys(room.players).forEach(id => room.scores[id] = 0);
    
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    setTimeout(() => sendQuestion(roomCode), 2000);
  });

  socket.on('next-question', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.currentQuestion++;
    if (room.currentQuestion >= room.questions.length) {
      endGame(roomCode);
    } else {
      sendQuestion(roomCode);
    }
  });

  socket.on('submit-answer', ({ roomCode, answerIndex }) => {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'playing') return;
    
    const question = room.questions[room.currentQuestion];
    
    // Проверяем, не отвечал ли уже этот игрок
    if (room.questionScores[room.currentQuestion]?.[socket.id]) return;
    
    const isCorrect = answerIndex === question.correct;
    const points = isCorrect ? Math.max(100, question.time * 10) : 0;
    
    if (!room.questionScores[room.currentQuestion]) {
      room.questionScores[room.currentQuestion] = {};
    }
    
    room.questionScores[room.currentQuestion][socket.id] = { 
      answer: answerIndex, 
      correct: isCorrect, 
      points: points, 
      time: Date.now() 
    };
    
    if (isCorrect) {
      room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
    }
    
    socket.emit('answer-submitted', { correct: isCorrect, points });
    
    const correctCount = Object.values(room.questionScores[room.currentQuestion]).filter(a => a.correct).length;
    const totalCount = Object.keys(room.questionScores[room.currentQuestion]).length;
    
    io.to(roomCode).emit('answer-stats', { 
      totalAnswers: totalCount, 
      correctAnswers: correctCount, 
      totalPlayers: Object.keys(room.players).length 
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    Object.values(rooms).forEach(room => {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(room.code).emit('players-update', { 
          players: Object.values(room.players), 
          playerCount: Object.keys(room.players).length 
        });
      }
    });
  });
});

function sendQuestion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  
  const question = room.questions[room.currentQuestion];
  
  io.to(roomCode).emit('new-question', {
    questionNumber: room.currentQuestion + 1,
    totalQuestions: room.questions.length,
    category: question.category,
    question: question.question,
    options: question.options,
    time: question.time
  });
}

function endGame(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  
  room.gameState = 'results';
  
  const leaderboard = Object.values(room.players).map(player => ({
    id: player.id,
    name: player.name,
    score: room.scores[player.id] || 0,
    avatar: player.avatar
  })).sort((a, b) => b.score - a.score);
  
  io.to(roomCode).emit('game-over', { leaderboard });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Host: http://localhost:${PORT}/host`);
});
