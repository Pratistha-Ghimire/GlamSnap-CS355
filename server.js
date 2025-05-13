
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const cookieParser = require('cookie-parser');
const bcrypt  = require('bcrypt');
const cors    = require('cors');
const Datastore = require('nedb');          // ← NEW

const app  = express();
const PORT = process.env.PORT || 5001;
const saltRounds = 10;

app.use(cors());
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(cookieParser());


const usersDb = new Datastore({ filename: path.join(__dirname, 'data', 'users.db'), autoload: true });
const looksDb = new Datastore({ filename: path.join(__dirname, 'data', 'looks.db'), autoload: true });

usersDb.ensureIndex({ fieldName: 'username', unique: true });  
looksDb.ensureIndex({ fieldName: 'username' });                


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success:false, message:'Username and password are required.' });

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    usersDb.insert({ username, password: hashedPassword }, (err) => {
      if (err && err.errorType === 'uniqueViolated')
        return res.status(400).json({ success:false, message:'Username already taken.' });
      if (err) return res.status(500).json({ success:false, message:'DB error.' });
      res.json({ success:true, message:'User registered successfully!' });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'Internal server error.' });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success:false, message:'Username and password are required.' });

  usersDb.findOne({ username }, async (err, user) => {
    if (err)   return res.status(500).json({ success:false, message:'DB error.' });
    if (!user) return res.status(401).json({ success:false, message:'Invalid username or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success:false, message:'Invalid username or password.' });

    
    res.json({ success:true, user:{ username:user.username }, message:'Login successful!' });
  });
});


app.post('/upload-look', upload.single('photo'), (req, res) => {
  const { username, tags, notes } = req.body;
  const photo = req.file;
  if (!username) return res.status(400).json({ success:false, message:'Username is required.' });
  if (!photo)    return res.status(400).json({ success:false, message:'No photo uploaded.' });

  usersDb.findOne({ username }, (err, user) => {
    if (err)   return res.status(500).json({ success:false, message:'DB error.' });
    if (!user) return res.status(400).json({ success:false, message:'Unknown user.' });

    const look = {
      username,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      notes,
      photoUrl: `/uploads/${photo.filename}`,
      createdAt: new Date()
    };

    looksDb.insert(look, (err, newDoc) => {
      if (err) return res.status(500).json({ success:false, message:'DB error.' });
      res.json({ success:true, message:'Look uploaded successfully!', data:newDoc });
    });
  });
});

app.get('/looks/:username', (req, res) => {
  const { username } = req.params;
  looksDb.find({ username }).sort({ createdAt: -1 }).exec((err, docs) => {
    if (err) return res.status(500).json({ success:false, message:'DB error.' });
    res.json({ success:true, data:docs });
  });
});


app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
