require('dotenv').config({ path: './backend/.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const paths = 'backend/';
const uploadMiddleware = multer({ dest: paths + 'uploads/' });
const fs = require('fs');
const pathModule = require('path');

const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET;

console.log('Loaded MONGO_DB');


app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(pathModule.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URL);

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const fileName = newPath.replace(/^.*uploads[\\/]/, '');
  const coverPath = 'uploads/' + fileName;

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: coverPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});


app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;

  if (req.file) {
    const { originalname, path: tempPath } = req.file;
    const ext = originalname.split('.').pop();
    newPath = tempPath + '.' + ext;
    fs.renameSync(tempPath, newPath);
    const fileName = newPath.replace(/^.*uploads[\\/]/, '');
    newPath = 'uploads/' + fileName;
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;

    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);

    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }

    const updatedData = {
      title,
      summary,
      content,
    };
    if (newPath) {
      updatedData.cover = newPath;
    }

    await postDoc.updateOne(updatedData);
    res.json({ ...postDoc.toObject(), ...updatedData });
  });
});

app.delete('/post/:id', async (req, res) => {
  const { token } = req.cookies;
  const { id } = req.params;

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(401).json('Unauthorized');

    const postDoc = await Post.findById(id);
    if (!postDoc) return res.status(404).json('Post not found');

    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) return res.status(403).json('You are not the author');

    // Optional: delete image file
    if (postDoc.cover) {
      const imagePath = pathModule.resolve(postDoc.cover);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Failed to delete image:', err);
      });
    }

    await Post.findByIdAndDelete(id);
    res.json({ success: true, message: 'Post deleted successfully' });
  });
});

app.get('/post', async (req, res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})

app.listen(process.env.PORT);
//
