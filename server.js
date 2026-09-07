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
     { category: "Dubai", question: "What is the tallest building in Dubai?", options: ["Burj Al Arab", "Burj Khalifa", "Emirates Tower", "Cayan Tower"], correct: 1, time: 15 },
     { category: "Dubai", question: "Which desert surrounds Dubai?", options: ["Sahara", "Gobi", "Arabian Desert", "Kalahari"], correct: 2, time: 15 },
     { category: "Birthday Star", question: "What is my favorite food?", options: ["Pizza", "Sushi", "Burgers", "Pasta"], correct: 1, time: 10 },
     { category: "Birthday Star", question: "Where do I want to travel most?", options: ["Japan", "Iceland", "Maldives", "Peru"], correct: 0, time: 10 },
     { category: "Dubai", question: "What is the name of the palm-shaped island?", options: ["Palm Jebel Ali", "Palm Jumeirah", "Palm Deira", "Bluewaters"], correct: 1, time: 15 }
   ];

   app.post('/api/create-room', async (req, res) => {
     const roomCode = generateRoomCode();
     const { hostName, questions } = req.body;
     rooms[roomCode] = {
       code: roomCode, hostName: hostName || 'Host', questions: questions || defaultQuestions,
       players: {}, currentQuestion: -1, gameState: 'lobby', scores: {}, questionScores: []
     };
     const qrCode = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/join/${roomCode}`);
     res.json({ roomCode, qrCode });
   });

   app.get('/api/room/:code', (req, res) => {
     const room = rooms[req.params.code];
     if (!room) return res.status(404).json({ error: 'Room not found' });
     res.json({ roomCode: room.code, hostName: room.hostName, playerCount: Object.keys(room.players).length, gameState: room.gameState });
   });

   // Чистые маршруты без .html
   app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
   app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
   app.get('/join', (req, res) => res.sendFile(path.join(__dirname, 'public', 'join.html')));
   app.get('/join/:code', (req, res) => res.sendFile(path.join(__dirname, 'public', 'join.html')));

   io.on('connection', (socket) => {
     socket.on('join-game', ({ roomCode, playerName }) => {
       const room = rooms[roomCode];
       if (!room) return socket.emit('error', 'Room not found');
       room.players[socket.id] = { id: socket.id, name: playerName, avatar: `🎮${Math.floor(Math.random() * 99)}` };
       socket.join(roomCode);
       socket.emit('joined-success', { playerId: socket.id, roomCode, playerName });
       io.to(roomCode).emit('players-update', { players: Object.values(room.players), playerCount: Object.keys(room.players).length });
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
       if (room.currentQuestion >= room.questions.length) endGame(roomCode);
       else sendQuestion(roomCode);
     });

     socket.on('submit-answer', ({ roomCode, answerIndex }) => {
       const room = rooms[roomCode];
       if (!room || room.gameState !== 'playing') return;
       const question = room.questions[room.currentQuestion];
       if (room.questionScores[room.currentQuestion]?.[socket.id]) return;
       
       const isCorrect = answerIndex === question.correct;
       const points = isCorrect ? Math.max(100, question.time * 10) : 0;
       if (!room.questionScores[room.currentQuestion]) room.questionScores[room.currentQuestion] = {};
       room.questionScores[room.currentQuestion][socket.id] = { answer: answerIndex, correct: isCorrect, points, time: Date.now() };
       if (isCorrect) room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
       
       socket.emit('answer-submitted', { correct: isCorrect, points });
       const correctCount = Object.values(room.questionScores[room.currentQuestion]).filter(a => a.correct).length;
       const totalCount = Object.keys(room.questionScores[room.currentQuestion]).length;
       io.to(roomCode).emit('answer-stats', { totalAnswers: totalCount, correctAnswers: correctCount, totalPlayers: Object.keys(room.players).length });
     });

     socket.on('disconnect', () => {
       Object.values(rooms).forEach(room => {
         if (room.players[socket.id]) {
           delete room.players[socket.id];
           io.to(room.code).emit('players-update', { players: Object.values(room.players), playerCount: Object.keys(room.players).length });
         }
       });
     });
   });

   function sendQuestion(roomCode) {
     const room = rooms[roomCode];
     const question = room.questions[room.currentQuestion];
     io.to(roomCode).emit('new-question', {
       questionNumber: room.currentQuestion + 1, totalQuestions: room.questions.length,
       category: question.category, question: question.question, options: question.options, time: question.time
     });
   }

   function endGame(roomCode) {
     const room = rooms[roomCode];
     room.gameState = 'results';
     const leaderboard = Object.values(room.players).map(player => ({
       id: player.id, name: player.name, score: room.scores[player.id] || 0, avatar: player.avatar
     })).sort((a, b) => b.score - a.score);
     io.to(roomCode).emit('game-over', { leaderboard });
   }

   const PORT = process.env.PORT || 3000;
   server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
