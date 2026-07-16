require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const pool = require('./db/pool');
const { requireLogin, requireTeamLead } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(authRoutes);
app.use(recordRoutes);
app.use(adminRoutes);
app.use(teamRoutes);

app.get('/', requireLogin, (req, res) => {
  if (req.session.user.role === 'admin') {
    return res.render('admin-dashboard', { user: req.session.user });
  }
  res.render('psr-dashboard', { user: req.session.user });
});

app.get('/team', requireLogin, requireTeamLead, (req, res) => {
  res.render('team-dashboard', { user: req.session.user });
});

app.use((req, res) => {
  res.status(404).send('找不到頁面');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' });
  }
  res.status(500).send('伺服器發生錯誤，請稍後再試');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Xolair MMP server running on port ${PORT}`);
});
