// server.js
// A simple Express.js backend for a Todo list API

const express = require('express');
const path = require('path')
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

// connection to db
const db = new sqlite3.Database('./todos.db', (err) => {
  console.log('Database path:', path.resolve('./todos.db'));
  if (err){
    console.error('Error opening database:', err);
  } else{
    console.log('Connected to SQLite database! :D');
  }
})

// create table if doesn't exist already
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    priority TEXT,
    isComplete BOOLEAN,
    isFun BOOLEAN
  )`);
})

// Middleware to parse JSON requests
app.use(express.json());

// Middle ware to inlcude static content

app.use(express.static('public'))

// server index.html
  app.get('/', (req, res) => {
    console.log('serving index.html');
      res.sendFile(path.join(__dirname,'public', 'index.html'));
  })

// GET all todo items
app.get('/todos', (req, res) => {
  db.all('Select * FROM todos', [], (err, rows) => {
    if (err){
      res.status(500).json({message: 'Database error', error: err.message});
    } else{
      res.json(rows);
    }
  })
});

// GET a specific todo item by ID
app.get('/todos/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM todos WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ message: 'Database error', error: err.message });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: 'Todo item not found' });
    }
  })
});

// POST a new todo item
app.post('/todos', (req, res) => {
  const { name, priority = 'low', isFun = false } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const stmt = db.prepare('INSERT INTO todos (name, priority, isComplete, isFun) VALUES (?, ?, ?, ?)');
  stmt.run(name, priority, false, isFun, function(err) {
    if (err) {
      res.status(500).json({ message: 'Database error', error: err.message });
    } else {
      const newTodo = {
        id: this.lastID,
        name,
        priority,
        isComplete: false,
        isFun
      };
      res.status(201).json(newTodo);
    }
  });

});

// DELETE a todo item by ID
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ message: 'Database error', error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: 'Todo item not found' });
    } else {
      //check if the table is empty
      db.get('SELECT COUNT(*) AS count FROM todos', [], (err, row) =>{
        if (err){
          return res.status(500).json({message: 'Database error', error: err.message})
        }

        if (row.count ===0){
          //resets the counter bc it was bothering me
          db.run('DELETE FROM sqlite_sequence WHERE name = "todos"', [], (err)=> {
            return res.json({message: `TO item ${id} deleted. ID counter reset.`});
          })
        } else {
          return res.json({message: `Todo item ${id} deleted.`})
        }
      })
      //res.json({ message: `Todo item ${id} deleted.` });
    }
  });
});

//close db on surver shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Closed SQLite database');
    }
    process.exit(0);
  })
})

// Start the server
app.listen(port, () => {
  console.log(`Todo API server running at http://localhost:${port}`);
});